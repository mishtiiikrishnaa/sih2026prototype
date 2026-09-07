from datetime import datetime, timedelta
from typing import Optional
import hashlib
import hmac
import base64
import json
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db, User
from config import get_settings

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

_HASH_ALGO = "pbkdf2_sha256"
_ITERATIONS = 120000


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        algo, iterations, salt_hex, hash_hex = stored_hash.split("$")
        if algo != _HASH_ALGO:
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        actual = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _ITERATIONS)
    return f"{_HASH_ALGO}${_ITERATIONS}${salt.hex()}${digest.hex()}"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {**data, "exp": int((datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))).timestamp())}

    def _sign(part: str) -> str:
        msg = f"{part}.".encode("utf-8")
        sig = hmac.new(settings.secret_key.encode("utf-8"), msg, hashlib.sha256).digest()
        return _b64url_encode(sig)

    signing_input = f"{_b64url_encode(json.dumps(header).encode())}.{_b64url_encode(json.dumps(payload).encode())}"
    return f"{signing_input}.{_sign(signing_input)}"


def _verify_signature(signing_input: str, provided_sig: str) -> bool:
    expected = _b64url_encode(hmac.new(settings.secret_key.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest())
    return hmac.compare_digest(expected, provided_sig)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise credentials_exception
        signing_input, provided_sig = f"{parts[0]}.{parts[1]}", parts[2]
        if not _verify_signature(signing_input, provided_sig):
            raise credentials_exception
        payload = json.loads(_b64url_decode(parts[1]))
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        if "exp" in payload and datetime.utcnow().timestamp() > payload["exp"]:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}"
            )
        return current_user
    return role_checker
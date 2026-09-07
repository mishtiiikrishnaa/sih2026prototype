from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import get_db, User
from auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_user, require_role
)
from services.embeddings import encode_text, build_solver_text

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str  # problem_owner | faculty | student | gov_admin
    institution: Optional[str] = None
    department: Optional[str] = None
    expertise_tags: Optional[List[str]] = []
    bio: Optional[str] = None
    district: Optional[str] = None
    designation: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    institution: Optional[str]
    department: Optional[str]
    expertise_tags: Optional[List[str]]
    bio: Optional[str]
    district: Optional[str]
    designation: Optional[str]
    avatar_initials: Optional[str]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    initials = "".join(w[0].upper() for w in user_in.full_name.split()[:2])
    
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        institution=user_in.institution,
        department=user_in.department,
        expertise_tags=user_in.expertise_tags or [],
        bio=user_in.bio,
        district=user_in.district,
        designation=user_in.designation,
        avatar_initials=initials,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Compute embedding for solver profiles
    if user.role in ("faculty", "student"):
        solver_text = build_solver_text(user)
        embedding = encode_text(solver_text)
        if embedding:
            user.embedding = embedding
            db.commit()
            db.refresh(user)

    return user


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

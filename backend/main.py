from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth, problems, matching, projects, dashboard
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Setu API",
    description="AI-augmented problem-solving ecosystem connecting government, universities, and industry — SIH PS26043",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(problems.router)
app.include_router(matching.router)
app.include_router(projects.router)
app.include_router(dashboard.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "setu-api"}


@app.get("/")
async def root():
    return {
        "name": "Setu API",
        "description": "AI-augmented societal problem-solving ecosystem",
        "ps_id": "SIH26043",
        "sponsor": "Government of Jharkhand",
        "docs": "/docs",
    }


@app.on_event("startup")
async def on_startup():
    logger.info("🌉 Setu API starting up...")
    # Always ensure demo users exist in DB (production-safe)
    from database import SessionLocal, User
    from auth import get_password_hash
    db = SessionLocal()
    try:
        demo_users = [
            {"email":"suresh.kumar@gov.jh.in","full_name":"Suresh Kumar","hashed_password":"demo123","role":"problem_owner","district":"Gumla","designation":"District Collector, Gumla","institution":"Government of Jharkhand","bio":"District Collector of Gumla district, Government of Jharkhand.","expertise_tags":[],"avatar_initials":"SK"},
            {"email":"priya.singh@bitmesra.ac.in","full_name":"Dr. Priya Singh","hashed_password":"demo123","role":"faculty","institution":"BIT Mesra, Ranchi","department":"Civil Engineering","bio":"10 years experience in rural water supply systems and watershed management in Jharkhand.","expertise_tags":["Water Resources","Rural Infrastructure","Sanitation","Hydrology"],"avatar_initials":"PS"},
            {"email":"rahul.sharma@bitmesra.ac.in","full_name":"Rahul Sharma","hashed_password":"demo123","role":"student","institution":"BIT Mesra, Ranchi","department":"Civil Engineering","bio":"Final year B.Tech student passionate about water resource management.","expertise_tags":["Water Resources","Hydrology","GIS","Rural Infrastructure"],"avatar_initials":"RS"},
            {"email":"secretary@education.jh.gov.in","full_name":"Dr. Nirmala Soren","hashed_password":"demo123","role":"gov_admin","institution":"Government of Jharkhand","designation":"Principal Secretary, Education Department","district":"Ranchi","bio":"Principal Secretary overseeing the Jharkhand Student Research and Innovation Policy.","expertise_tags":[],"avatar_initials":"NS"},
        ]
        for du in demo_users:
            existing = db.query(User).filter(User.email == du["email"]).first()
            if not existing:
                user = User(
                    email=du["email"],
                    full_name=du["full_name"],
                    hashed_password=get_password_hash(du["hashed_password"]),
                    role=du["role"],
                    institution=du.get("institution"),
                    department=du.get("department"),
                    bio=du.get("bio"),
                    district=du.get("district"),
                    designation=du.get("designation"),
                    expertise_tags=du.get("expertise_tags", []),
                    avatar_initials=du.get("avatar_initials"),
                )
                db.add(user)
        db.commit()
        count = db.query(User).count()
        logger.info(f"Demo users ensured. Database has {count} users.")
    finally:
        db.close()

    # Auto-seed full database only if completely empty
    from database import SessionLocal, User, Problem
    db = SessionLocal()
    try:
        count = db.query(User).count()
        if count <= 4:  # only demo users present
            logger.info("Seeding full problem/faculty/student dataset...")
            from seed_data import seed_database
            seed_database()
        else:
            logger.info(f"Database has {count} users, skipping full seed.")
    finally:
        db.close()

    # Preload embedding model (now Gemini-based, lightweight)
    logger.info("Loading embedding service...")
    try:
        from services.embeddings import encode_text, build_solver_text, build_problem_text
        encode_text("test")
        logger.info("Embedding service ready.")
    except Exception as e:
        logger.error(f"Embedding service init failed: {e}")

    # Ensure embeddings present for existing solvers/problems
    logger.info("Checking embeddings...")
    db = SessionLocal()
    try:
        from services.embeddings import build_solver_text, build_problem_text, encode_text
        all_users = db.query(User).all()
        problems = db.query(Problem).all()
        changed = False
        for user in all_users:
            if user.role in ("faculty", "student") and (not user.embedding):
                text = build_solver_text(user)
                emb = encode_text(text)
                if emb:
                    user.embedding = emb
                    changed = True
                    logger.info(f"Embedded user {user.id}")
        for prob in problems:
            if not prob.embedding:
                text = build_problem_text(prob)
                emb = encode_text(text)
                if emb:
                    prob.embedding = emb
                    changed = True
                    logger.info(f"Embedded problem {prob.id}")
        if changed:
            db.commit()
            logger.info("Embeddings saved.")
        else:
            logger.info("All embeddings present.")
    except Exception as e:
        logger.error(f"Embedding computation failed: {e}")
    finally:
        db.close()

    logger.info("✅ Setu API ready!")

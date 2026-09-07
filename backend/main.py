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
    # Auto-seed if empty
    from database import SessionLocal, User, Problem
    db = SessionLocal()
    try:
        count = db.query(User).count()
        if count == 0:
            logger.info("Database empty, running seed...")
            from seed_data import seed_database
            seed_database()
        else:
            logger.info(f"Database has {count} users, skipping seed.")
    finally:
        db.close()

    # Preload sentence-transformer model to avoid first-request hangs
    logger.info("Loading embedding model (this may take 30-60s)...")
    try:
        from services.embeddings import get_model, encode_text, build_solver_text, build_problem_text
        get_model()
        logger.info("Embedding model loaded.")
    except Exception as e:
        logger.error(f"Failed to preload embedding model: {e}")

    # Ensure all existing solvers and problems have embeddings
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
                    logger.info(f"Embedded user {user.id} ({user.full_name})")
        for prob in problems:
            if not prob.embedding:
                text = build_problem_text(prob)
                emb = encode_text(text)
                if emb:
                    prob.embedding = emb
                    changed = True
                    logger.info(f"Embedded problem {prob.id} ({prob.title[:40]}...)")
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

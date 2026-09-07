from sqlalchemy import create_engine, Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./setu.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # problem_owner | faculty | student | gov_admin
    institution = Column(String, nullable=True)
    department = Column(String, nullable=True)
    expertise_tags = Column(JSON, default=list)   # list of strings
    bio = Column(Text, nullable=True)
    district = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    embedding = Column(JSON, nullable=True)   # stored as list[float]
    avatar_initials = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    problems = relationship("Problem", back_populates="owner")
    team_memberships = relationship("TeamMember", back_populates="user")


class Problem(Base):
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    situation = Column(Text, nullable=False)
    gap = Column(Text, nullable=False)
    desired_outcome = Column(Text, nullable=False)
    constraints = Column(Text, nullable=True)
    domain = Column(JSON, default=list)        # list of domain strings
    sdg_tags = Column(JSON, default=list)      # list of SDG strings
    difficulty = Column(String, default="medium")  # easy | medium | hard
    district = Column(String, nullable=True)
    budget = Column(String, nullable=True)
    timeline = Column(String, nullable=True)
    status = Column(String, default="open")    # open | matched | in_progress | solved | verified
    owner_id = Column(Integer, ForeignKey("users.id"))
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="problems")
    projects = relationship("Project", back_populates="problem")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    title = Column(String, nullable=False)
    stage = Column(String, default="discovery")  # discovery|proposal|research|prototype|evaluation|deployment|verified
    description = Column(Text, nullable=True)
    outcome_evidence = Column(Text, nullable=True)
    outcome_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    problem = relationship("Problem", back_populates="projects")
    members = relationship("TeamMember", back_populates="project")
    milestones = relationship("Milestone", back_populates="project")


class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role_in_team = Column(String, default="member")  # lead | mentor | member
    status = Column(String, default="active")   # interested | active | inactive
    joined_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")   # pending | in_progress | completed
    evidence_url = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="milestones")


class InterestRequest(Base):
    __tablename__ = "interest_requests"
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text, nullable=True)
    status = Column(String, default="pending")   # pending | accepted | rejected
    created_at = Column(DateTime, default=datetime.utcnow)

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db, Problem, User
from auth import get_current_user, require_role
from services.embeddings import encode_text, build_problem_text
from services.ai_wizard import run_wizard

router = APIRouter(prefix="/api/problems", tags=["problems"])


class WizardInput(BaseModel):
    situation: str
    gap: str
    outcome: str
    constraints: Optional[str] = ""
    location: Optional[str] = "Jharkhand"
    budget: Optional[str] = ""
    timeline: Optional[str] = ""
    domain_hint: Optional[str] = ""


class ProblemCreate(BaseModel):
    title: str
    situation: str
    gap: str
    desired_outcome: str
    constraints: Optional[str] = ""
    domain: Optional[List[str]] = []
    sdg_tags: Optional[List[str]] = []
    difficulty: Optional[str] = "medium"
    district: Optional[str] = ""
    budget: Optional[str] = ""
    timeline: Optional[str] = ""


class ProblemOut(BaseModel):
    id: int
    title: str
    situation: str
    gap: str
    desired_outcome: str
    constraints: Optional[str]
    domain: Optional[List[str]]
    sdg_tags: Optional[List[str]]
    difficulty: str
    district: Optional[str]
    budget: Optional[str]
    timeline: Optional[str]
    status: str
    owner_id: int
    created_at: datetime
    owner_name: Optional[str] = None
    owner_designation: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/wizard")
async def wizard_generate(
    data: WizardInput,
    current_user: User = Depends(get_current_user)
):
    """Run the AI Articulation Wizard to generate a structured problem statement."""
    result = await run_wizard(data.dict())
    return result


@router.post("/", response_model=ProblemOut)
async def create_problem(
    problem_in: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish a new problem to the marketplace."""
    problem = Problem(
        title=problem_in.title,
        situation=problem_in.situation,
        gap=problem_in.gap,
        desired_outcome=problem_in.desired_outcome,
        constraints=problem_in.constraints,
        domain=problem_in.domain or [],
        sdg_tags=problem_in.sdg_tags or [],
        difficulty=problem_in.difficulty,
        district=problem_in.district,
        budget=problem_in.budget,
        timeline=problem_in.timeline,
        status="open",
        owner_id=current_user.id,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    # Generate embedding
    text = build_problem_text(problem)
    embedding = encode_text(text)
    if embedding:
        problem.embedding = embedding
        db.commit()
        db.refresh(problem)

    result = ProblemOut.from_orm(problem)
    result.owner_name = current_user.full_name
    result.owner_designation = current_user.designation
    return result


@router.get("/", response_model=List[ProblemOut])
async def list_problems(
    domain: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """List and filter problems. Role-aware: owners see theirs, solvers see open, gov sees all."""
    q = db.query(Problem)
    if current_user:
        if current_user.role == 'problem_owner':
            q = q.filter(Problem.owner_id == current_user.id)
        elif current_user.role in ('faculty', 'student'):
            q = q.filter(Problem.status == 'open')
        elif current_user.role == 'gov_admin':
            pass  # show all
    else:
        q = q.filter(Problem.status == 'open')
    if status:
        q = q.filter(Problem.status == status)
    if difficulty:
        q = q.filter(Problem.difficulty == difficulty)
    if district:
        q = q.filter(Problem.district.ilike(f"%{district}%"))
    if search:
        q = q.filter(
            Problem.title.ilike(f"%{search}%") |
            Problem.situation.ilike(f"%{search}%") |
            Problem.gap.ilike(f"%{search}%")
        )
    if domain:
        # SQLite JSON filter — check if domain string appears in JSON array
        q = q.filter(Problem.domain.like(f'%{domain}%'))

    # Role-aware ordering: solvers get random shuffle; admin gets all by status; owner by date desc
    if current_user:
        if current_user.role == 'problem_owner':
            problems = q.order_by(Problem.created_at.desc()).offset(skip).limit(limit).all()
        elif current_user.role == 'gov_admin':
            problems = q.order_by(Problem.status.asc(), Problem.created_at.desc()).offset(skip).limit(limit).all()
        elif current_user.role in ('faculty', 'student'):
            # Random shuffle so marketplace looks different per user/session
            import random
            all_ids = [r[0] for r in q.with_entities(Problem.id).all()]
            random.shuffle(all_ids)
            selected_ids = all_ids[skip:skip+limit]
            selected_ids_str = ",".join(str(i) for i in selected_ids)
            if selected_ids_str:
                problems = db.query(Problem).filter(Problem.id.in_(selected_ids)).all()
                # Preserve shuffle order
                id_order = {i: idx for idx, i in enumerate(selected_ids)}
                problems.sort(key=lambda p: id_order[p.id])
            else:
                problems = []
        else:
            problems = q.order_by(Problem.created_at.desc()).offset(skip).limit(limit).all()
    else:
        problems = q.filter(Problem.status == 'open').order_by(Problem.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for p in problems:
        out = ProblemOut.from_orm(p)
        if p.owner:
            out.owner_name = p.owner.full_name
            out.owner_designation = p.owner.designation
        result.append(out)
    return result


@router.get("/{problem_id}", response_model=ProblemOut)
async def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    out = ProblemOut.from_orm(problem)
    if problem.owner:
        out.owner_name = problem.owner.full_name
        out.owner_designation = problem.owner.designation
    return out


@router.patch("/{problem_id}/status")
async def update_status(
    problem_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    if problem.owner_id != current_user.id and current_user.role != "gov_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    problem.status = status
    db.commit()
    return {"message": "Status updated", "status": status}

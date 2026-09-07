from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db, Problem, Project, TeamMember, Milestone, User, InterestRequest
from auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])

VALID_STAGES = ["discovery", "proposal", "research", "prototype", "evaluation", "deployment", "verified"]


class ProjectCreate(BaseModel):
    problem_id: int
    title: str
    description: Optional[str] = ""


class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = ""


class InterestCreate(BaseModel):
    problem_id: int
    message: Optional[str] = ""


# ─── Interest Requests ────────────────────────────────────────────────────────

@router.post("/interest")
async def express_interest(
    data: InterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("faculty", "student"):
        raise HTTPException(status_code=403, detail="Only solvers can express interest")
    existing = db.query(InterestRequest).filter(
        InterestRequest.problem_id == data.problem_id,
        InterestRequest.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already expressed interest")
    req = InterestRequest(
        problem_id=data.problem_id,
        user_id=current_user.id,
        message=data.message,
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Interest registered", "request_id": req.id}


@router.get("/interest/problem/{problem_id}")
async def get_interest_requests(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    if problem.owner_id != current_user.id and current_user.role != "gov_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    requests = db.query(InterestRequest).filter(InterestRequest.problem_id == problem_id).all()
    result = []
    for r in requests:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "request_id": r.id,
            "user_id": r.user_id,
            "full_name": user.full_name if user else "Unknown",
            "institution": user.institution if user else "",
            "department": user.department if user else "",
            "role": user.role if user else "",
            "expertise_tags": user.expertise_tags if user else [],
            "message": r.message,
            "status": r.status,
            "created_at": r.created_at,
        })
    return result


@router.patch("/interest/{request_id}/accept")
async def accept_interest(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(InterestRequest).filter(InterestRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    problem = db.query(Problem).filter(Problem.id == req.problem_id).first()
    if problem.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    req.status = "accepted"
    
    # Check if a project already exists for this problem
    project = db.query(Project).filter(Project.problem_id == req.problem_id).first()
    if not project:
        project = Project(
            problem_id=req.problem_id,
            title=f"Project: {problem.title}",
            description="",
            stage="discovery"
        )
        db.add(project)
        db.flush()
        problem.status = "in_progress"

    # Add member if not already there
    existing_member = db.query(TeamMember).filter(
        TeamMember.project_id == project.id,
        TeamMember.user_id == req.user_id
    ).first()
    if not existing_member:
        member = TeamMember(
            project_id=project.id,
            user_id=req.user_id,
            role_in_team="lead" if not db.query(TeamMember).filter(TeamMember.project_id == project.id).first() else "member",
            status="active"
        )
        db.add(member)

    db.commit()
    return {"message": "Interest accepted, team member added", "project_id": project.id}


# ─── Projects ─────────────────────────────────────────────────────────────────

@router.get("/")
async def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "gov_admin":
        projects = db.query(Project).all()
    elif current_user.role == "problem_owner":
        problem_ids = [p.id for p in db.query(Problem).filter(Problem.owner_id == current_user.id).all()]
        projects = db.query(Project).filter(Project.problem_id.in_(problem_ids)).all()
    else:
        member_project_ids = [m.project_id for m in db.query(TeamMember).filter(TeamMember.user_id == current_user.id).all()]
        projects = db.query(Project).filter(Project.id.in_(member_project_ids)).all()

    result = []
    for p in projects:
        problem = db.query(Problem).filter(Problem.id == p.problem_id).first()
        members = db.query(TeamMember).filter(TeamMember.project_id == p.id).all()
        member_details = []
        for m in members:
            u = db.query(User).filter(User.id == m.user_id).first()
            if u:
                member_details.append({
                    "user_id": u.id,
                    "full_name": u.full_name,
                    "role_in_team": m.role_in_team,
                    "institution": u.institution,
                    "avatar_initials": u.avatar_initials,
                })
        milestones = db.query(Milestone).filter(Milestone.project_id == p.id).all()
        result.append({
            "id": p.id,
            "problem_id": p.problem_id,
            "problem_title": problem.title if problem else "",
            "problem_domain": problem.domain if problem else [],
            "problem_district": problem.district if problem else "",
            "title": p.title,
            "stage": p.stage,
            "description": p.description,
            "outcome_evidence": p.outcome_evidence,
            "outcome_verified_at": p.outcome_verified_at,
            "members": member_details,
            "milestone_count": len(milestones),
            "milestones_completed": sum(1 for m in milestones if m.status == "completed"),
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        })
    return result


@router.get("/{project_id}")
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    problem = db.query(Problem).filter(Problem.id == project.problem_id).first()
    members = db.query(TeamMember).filter(TeamMember.project_id == project.id).all()
    milestones = db.query(Milestone).filter(Milestone.project_id == project.id).order_by(Milestone.created_at).all()

    member_details = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            member_details.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role_in_team": m.role_in_team,
                "institution": u.institution,
                "department": u.department,
                "avatar_initials": u.avatar_initials,
                "status": m.status,
            })

    return {
        "id": project.id,
        "problem_id": project.problem_id,
        "problem_title": problem.title if problem else "",
        "problem_domain": problem.domain if problem else [],
        "problem_district": problem.district if problem else "",
        "problem_situation": problem.situation if problem else "",
        "problem_desired_outcome": problem.desired_outcome if problem else "",
        "title": project.title,
        "stage": project.stage,
        "description": project.description,
        "outcome_evidence": project.outcome_evidence,
        "outcome_verified_at": project.outcome_verified_at,
        "members": member_details,
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "status": m.status,
                "due_date": m.due_date,
                "completed_at": m.completed_at,
                "evidence_url": m.evidence_url,
            } for m in milestones
        ],
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.patch("/{project_id}/stage")
async def advance_stage(
    project_id: int,
    stage: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.stage = stage
    project.updated_at = datetime.utcnow()
    if stage == "verified":
        project.outcome_verified_at = datetime.utcnow()
        problem = db.query(Problem).filter(Problem.id == project.problem_id).first()
        if problem:
            problem.status = "verified"
    db.commit()
    return {"message": "Stage updated", "stage": stage}


@router.patch("/{project_id}/verify")
async def verify_outcome(
    project_id: int,
    evidence: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Problem owner confirms the solution was implemented in the real world."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    problem = db.query(Problem).filter(Problem.id == project.problem_id).first()
    if problem and problem.owner_id != current_user.id and current_user.role != "gov_admin":
        raise HTTPException(status_code=403, detail="Only the problem owner can verify outcomes")
    project.stage = "verified"
    project.outcome_evidence = evidence
    project.outcome_verified_at = datetime.utcnow()
    if problem:
        problem.status = "verified"
    db.commit()
    return {"message": "Outcome verified!", "verified_at": project.outcome_verified_at}


# ─── Milestones ───────────────────────────────────────────────────────────────

@router.post("/{project_id}/milestones")
async def add_milestone(
    project_id: int,
    data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    milestone = Milestone(
        project_id=project_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status="pending"
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/milestones/{milestone_id}/complete")
async def complete_milestone(
    milestone_id: int,
    evidence_url: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    milestone.status = "completed"
    milestone.completed_at = datetime.utcnow()
    milestone.evidence_url = evidence_url
    db.commit()
    return {"message": "Milestone completed", "milestone_id": milestone_id}

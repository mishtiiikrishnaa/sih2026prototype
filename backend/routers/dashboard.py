from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Problem, Project, User, TeamMember
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Government analytics dashboard stats.
    Aggregates platform-wide metrics for oversight.
    """
    total_problems = db.query(Problem).count()
    open_problems = db.query(Problem).filter(Problem.status == "open").count()
    in_progress = db.query(Problem).filter(Problem.status == "in_progress").count()
    solved = db.query(Problem).filter(Problem.status.in_(["solved", "verified"])).count()
    verified = db.query(Problem).filter(Problem.status == "verified").count()
    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.stage.notin_(["verified"])).count()
    total_solvers = db.query(User).filter(User.role.in_(["faculty", "student"])).count()
    total_faculty = db.query(User).filter(User.role == "faculty").count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_problem_owners = db.query(User).filter(User.role == "problem_owner").count()

    # Problems by domain
    problems = db.query(Problem).all()
    domain_counts = {}
    for p in problems:
        for d in (p.domain or []):
            domain_counts[d] = domain_counts.get(d, 0) + 1

    # Problems by district
    district_counts = {}
    for p in problems:
        if p.district:
            district_counts[p.district] = district_counts.get(p.district, 0) + 1

    # Problems by status
    status_counts = {
        "Open": open_problems,
        "In Progress": in_progress,
        "Solved": solved - verified,
        "Verified": verified,
    }

    # Projects by stage
    all_projects = db.query(Project).all()
    stage_counts = {}
    for proj in all_projects:
        stage_counts[proj.stage] = stage_counts.get(proj.stage, 0) + 1

    # Institution participation
    all_members = db.query(TeamMember).all()
    institution_map = {}
    for member in all_members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user and user.institution:
            institution_map[user.institution] = institution_map.get(user.institution, 0) + 1

    institution_data = [
        {"institution": k, "members": v}
        for k, v in sorted(institution_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # Recent verified projects
    verified_projects = db.query(Project).filter(
        Project.stage == "verified", Project.outcome_verified_at.isnot(None)
    ).order_by(Project.outcome_verified_at.desc()).limit(5).all()

    verified_details = []
    for vp in verified_projects:
        problem = db.query(Problem).filter(Problem.id == vp.problem_id).first()
        verified_details.append({
            "project_id": vp.id,
            "problem_title": problem.title if problem else "",
            "district": problem.district if problem else "",
            "domain": problem.domain if problem else [],
            "verified_at": vp.outcome_verified_at,
        })

    return {
        "summary": {
            "total_problems": total_problems,
            "open_problems": open_problems,
            "in_progress": in_progress,
            "solved": solved,
            "verified": verified,
            "total_projects": total_projects,
            "active_projects": active_projects,
            "total_solvers": total_solvers,
            "total_faculty": total_faculty,
            "total_students": total_students,
            "total_problem_owners": total_problem_owners,
            "resolution_rate": round((solved / total_problems * 100) if total_problems > 0 else 0, 1),
        },
        "domain_distribution": [
            {"domain": k, "count": v}
            for k, v in sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "district_distribution": [
            {"district": k, "count": v}
            for k, v in sorted(district_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "status_distribution": [
            {"status": k, "count": v} for k, v in status_counts.items()
        ],
        "stage_distribution": [
            {"stage": k, "count": v} for k, v in stage_counts.items()
        ],
        "institution_participation": institution_data,
        "recent_verifications": verified_details,
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Problem, User
from auth import get_current_user
from services.matching import match_solvers_for_problem, match_problems_for_solver

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.get("/problem/{problem_id}/solvers")
async def get_solvers_for_problem(
    problem_id: int,
    top_k: int = 8,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return semantically matched solvers for a problem.
    Uses sentence-transformer embeddings + tag overlap scoring.
    """
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    matches = match_solvers_for_problem(db, problem, top_k=top_k)
    return {
        "problem_id": problem_id,
        "problem_title": problem.title,
        "match_count": len(matches),
        "matches": matches,
    }


@router.get("/solver/problems")
async def get_problems_for_solver(
    top_k: int = 8,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return semantically matched open problems for the logged-in solver.
    """
    if current_user.role not in ("faculty", "student"):
        raise HTTPException(status_code=403, detail="Only solvers can use this endpoint")

    matches = match_problems_for_solver(db, current_user, top_k=top_k)
    return {
        "solver_id": current_user.id,
        "solver_name": current_user.full_name,
        "match_count": len(matches),
        "matches": matches,
    }

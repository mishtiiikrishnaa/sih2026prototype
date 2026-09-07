"""
Semantic matching service.

Algorithm:
1. Encode problem text → 384-dim embedding
2. For each solver with a stored embedding, compute cosine similarity
3. Add domain tag overlap bonus (0-0.2 score boost)
4. Rank by combined score
5. Generate human-readable explanation

Score formula:
  final_score = 0.75 * semantic_similarity + 0.25 * tag_overlap_score

If embeddings are unavailable (model not loaded), falls back to
pure tag-overlap matching — clearly labelled as keyword-based.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database import User, Problem
from services.embeddings import cosine_similarity, build_solver_text, build_problem_text, encode_text
import logging

logger = logging.getLogger(__name__)

SOLVER_ROLES = {"faculty", "student"}


def compute_tag_overlap(problem_domains: List[str], user_tags: List[str]) -> float:
    """Return overlap ratio between problem domains and solver expertise tags."""
    if not problem_domains or not user_tags:
        return 0.0
    p_set = {t.lower() for t in problem_domains}
    u_set = {t.lower() for t in user_tags}
    # Also check partial matches
    overlap = 0
    for pt in p_set:
        for ut in u_set:
            if pt in ut or ut in pt:
                overlap += 1
                break
    return min(1.0, overlap / max(len(p_set), 1))


def generate_explanation(user: User, problem: Problem, sem_score: float, tag_score: float) -> str:
    """Generate a human-readable explanation of why this solver was matched."""
    reasons = []
    
    if user.expertise_tags:
        matched_tags = []
        for tag in user.expertise_tags:
            for domain in (problem.domain or []):
                if tag.lower() in domain.lower() or domain.lower() in tag.lower():
                    matched_tags.append(tag)
                    break
        if matched_tags:
            reasons.append(f"expertise in {', '.join(matched_tags[:3])}")
    
    if user.department:
        reasons.append(f"{user.department} background")
    
    if user.institution:
        reasons.append(f"from {user.institution}")
    
    if not reasons:
        reasons.append("relevant academic profile")
    
    if sem_score > 0.7:
        quality = "Strong semantic match"
    elif sem_score > 0.5:
        quality = "Good semantic match"
    else:
        quality = "Keyword match"
    
    return f"{quality} · Matched because of {' and '.join(reasons[:2])}."


def match_solvers_for_problem(
    db: Session,
    problem: Problem,
    top_k: int = 8
) -> List[Dict[str, Any]]:
    """
    Return top-k solvers ranked by combined semantic + tag score.
    """
    solvers = db.query(User).filter(User.role.in_(SOLVER_ROLES)).all()
    if not solvers:
        return []

    results = []
    problem_embedding = problem.embedding
    
    # If problem has no embedding, compute it
    if not problem_embedding:
        problem_text = build_problem_text(problem)
        problem_embedding = encode_text(problem_text)

    for solver in solvers:
        tag_score = compute_tag_overlap(problem.domain or [], solver.expertise_tags or [])
        sem_score = 0.0
        embedding_used = False

        if problem_embedding and solver.embedding:
            sem_score = cosine_similarity(problem_embedding, solver.embedding)
            embedding_used = True

        if embedding_used:
            final_score = 0.75 * sem_score + 0.25 * tag_score
        else:
            # Fallback: pure tag overlap
            final_score = tag_score
            sem_score = tag_score  # for display

        results.append({
            "user_id": solver.id,
            "full_name": solver.full_name,
            "email": solver.email,
            "role": solver.role,
            "institution": solver.institution,
            "department": solver.department,
            "expertise_tags": solver.expertise_tags or [],
            "bio": solver.bio or "",
            "avatar_initials": solver.avatar_initials or solver.full_name[:2].upper(),
            "match_score": round(final_score * 100, 1),
            "semantic_score": round(sem_score * 100, 1),
            "tag_score": round(tag_score * 100, 1),
            "match_method": "semantic+tags" if embedding_used else "keyword-tags",
            "explanation": generate_explanation(solver, problem, sem_score, tag_score),
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:top_k]


def match_problems_for_solver(
    db: Session,
    user: User,
    top_k: int = 8
) -> List[Dict[str, Any]]:
    """
    Return top-k problems that match a solver's profile.
    """
    problems = db.query(Problem).filter(Problem.status == "open").all()
    if not problems:
        return []

    results = []
    solver_embedding = user.embedding

    for problem in problems:
        tag_score = compute_tag_overlap(problem.domain or [], user.expertise_tags or [])
        sem_score = 0.0
        embedding_used = False

        if solver_embedding and problem.embedding:
            sem_score = cosine_similarity(solver_embedding, problem.embedding)
            embedding_used = True

        if embedding_used:
            final_score = 0.75 * sem_score + 0.25 * tag_score
        else:
            final_score = tag_score
            sem_score = tag_score

        results.append({
            "problem_id": problem.id,
            "title": problem.title,
            "domain": problem.domain or [],
            "district": problem.district or "",
            "difficulty": problem.difficulty,
            "status": problem.status,
            "sdg_tags": problem.sdg_tags or [],
            "match_score": round(final_score * 100, 1),
            "semantic_score": round(sem_score * 100, 1),
            "tag_score": round(tag_score * 100, 1),
            "match_method": "semantic+tags" if embedding_used else "keyword-tags",
            "explanation": f"Matches your expertise in {', '.join((user.expertise_tags or ['your field'])[:2])}.",
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:top_k]

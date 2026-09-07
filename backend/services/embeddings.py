"""
Embedding service using Gemini embed-content API.
Replaces local sentence-transformers for serverless deployment.
"""

import os
import math
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

genai = None
try:
    import google.generativeai as _genai
    _genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
    genai = _genai
except Exception as e:
    logger.warning(f"Gemini unavailable; using tag-based matching: {e}")


def encode_text(text: str) -> Optional[List[float]]:
    """
    Encode text to a dense vector using Gemini embedding API.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or genai is None:
        logger.error("GEMINI_API_KEY not set; embeddings unavailable.")
        return None
    try:
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
        )
        return result.get("embedding", [])
    except Exception as e:
        logger.error(f"Gemini embedding failed: {e}")
        return None


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Compute cosine similarity between two normalized vectors using pure Python.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def build_solver_text(user) -> str:
    parts = [
        user.full_name or "",
        user.department or "",
        user.institution or "",
        user.bio or "",
    ]
    if user.expertise_tags:
        parts.append(" ".join(user.expertise_tags))
    return " ".join(p for p in parts if p).strip()


def build_problem_text(problem) -> str:
    parts = [
        problem.title or "",
        problem.situation or "",
        problem.gap or "",
        problem.desired_outcome or "",
    ]
    if problem.domain:
        parts.append(" ".join(problem.domain))
    if problem.sdg_tags:
        parts.append(" ".join(problem.sdg_tags))
    return " ".join(p for p in parts if p).strip()

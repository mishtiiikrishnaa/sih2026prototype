"""
Embedding service using sentence-transformers.
Computes 384-dim dense vectors for semantic similarity matching.
Model: paraphrase-multilingual-MiniLM-L12-v2
  - Supports 50+ languages including Hindi
  - Runs on CPU, ~120MB download
  - Free, open-source
"""

import numpy as np
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

_model = None


def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformer model...")
            _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load sentence-transformers: {e}")
            _model = None
    return _model


def encode_text(text: str) -> Optional[List[float]]:
    """
    Encode text to a 384-dimensional vector.
    Returns None if model is unavailable (graceful degradation).
    """
    model = get_model()
    if model is None:
        return None
    try:
        vector = model.encode(text, normalize_embeddings=True)
        return vector.tolist()
    except Exception as e:
        logger.error(f"Encoding failed: {e}")
        return None


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Since we normalize embeddings, dot product == cosine similarity.
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def build_solver_text(user) -> str:
    """Build a rich text representation of a solver's profile for embedding."""
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
    """Build a rich text representation of a problem for embedding."""
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

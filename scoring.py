from typing import List, Tuple, Dict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from sentence_transformers import SentenceTransformer

    _sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception:  # pragma: no cover - graceful fallback
    _sbert_model = None


_vectorizer = TfidfVectorizer(stop_words="english")


def _semantic_similarity(jd_text: str, resume_text: str) -> float:
    """
    Compute semantic similarity between job description and resume.
    Prefer SBERT embeddings if available, otherwise fall back to TF-IDF.
    Returns a value in [0, 1].
    """
    if _sbert_model is not None:
        embeddings = _sbert_model.encode(
            [jd_text, resume_text], normalize_embeddings=True
        )
        # Cosine between normalized vectors is just dot product
        sim = float(np.dot(embeddings[0], embeddings[1]))
        # Numerical guard, ensure in [0,1]
        return max(0.0, min(1.0, sim))

    # Fallback: TF-IDF cosine similarity
    docs = [jd_text, resume_text]
    tfidf = _vectorizer.fit_transform(docs)
    sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
    return float(sim)


def _skills_score(
    jd_skills: List[str], resume_skills: List[str]
) -> Tuple[float, List[str], List[str]]:
    """
    Score based on overlap of skills between job description and resume.
    Returns (score in [0,1], matched_skills, missing_skills).
    """
    jd_set = set(jd_skills)
    res_set = set(resume_skills)

    if not jd_set:
        # No explicit JD skills; neutral skills score.
        return 0.5, [], sorted(res_set)

    matched = sorted(jd_set & res_set)
    missing = sorted(jd_set - res_set)
    score = len(matched) / len(jd_set)
    return float(score), matched, missing


def _experience_score(jd_years: int, resume_years: int) -> float:
    """
    More meaningful continuous score for experience.
    - If no required years specified, return neutral 0.5.
    - If resume years >= required: 1.0
    - Else: resume_years / required_years (clamped to [0,1]).
    """
    if jd_years <= 0:
        return 0.5

    if resume_years >= jd_years:
        return 1.0

    ratio = resume_years / float(jd_years)
    return max(0.0, min(1.0, ratio))


def compute_score(
    jd_text: str,
    resume_text: str,
    jd_skills: List[str],
    resume_skills: List[str],
    jd_exp: int,
    resume_exp: int,
) -> Tuple[float, List[str], List[str], str, Dict[str, float], str]:
    """
    Compute final score out of 100 with explanation and skill breakdown.
    Returns: (final_score, matched_skills, missing_skills, explanation, component_scores, match_label)
    """
    s_sem = _semantic_similarity(jd_text, resume_text)
    s_skills, matched, missing = _skills_score(jd_skills, resume_skills)
    s_exp = _experience_score(jd_exp, resume_exp)

    # Weighted combination (no aggressive scaling)
    final_raw = 0.45 * s_skills + 0.35 * s_sem + 0.20 * s_exp

    # Apply penalties based on missing skills
    if missing and len(jd_skills) > 0:
        # If there are missing skills, cap the final score
        # The score should not exceed the skills match percentage significantly
        missing_ratio = len(missing) / len(jd_skills)
        # Cap final score: can't exceed skills match by more than 5-10%
        max_allowed = s_skills + (1.0 - s_skills) * 0.10  # Skills match + up to 10% of remaining
        final_scaled = min(max_allowed, final_raw)
    else:
        # No missing skills - apply light scaling only if all components are high
        # Only scale if skills, semantic, and experience are all above 0.8
        if s_skills >= 0.8 and s_sem >= 0.8 and s_exp >= 0.8:
            # All components are strong - can apply light boost
            final_scaled = min(1.0, final_raw * 1.10)  # Reduced from 1.25 to 1.10
        elif s_skills >= 0.9 and s_sem >= 0.7 and s_exp >= 0.7:
            # Very strong skills with decent other components
            final_scaled = min(0.95, final_raw * 1.05)  # Cap at 95%
        else:
            # Don't scale - use raw score
            final_scaled = min(1.0, final_raw)
    
    final_score = final_scaled * 100

    # Component scores for visualization (as percentages)
    component_scores = {
        "skills": round(s_skills * 100, 1),
        "semantic": round(s_sem * 100, 1),
        "experience": round(s_exp * 100, 1),
    }

    # Match label
    if final_score >= 90:
        match_label = "Strong Match"
    elif final_score >= 50:
        match_label = "Moderate Match"
    else:
        match_label = "Weak Match"

    explanation = (
        f"Skills match: {s_skills:.2f}, Semantic match: {s_sem:.2f}, "
        f"Experience match: {s_exp:.2f}. Final score (0-100): {final_score:.1f}."
    )
    return final_score, matched, missing, explanation, component_scores, match_label



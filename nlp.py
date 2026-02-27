import re
from typing import List, Tuple, Set


# Simple skills dictionary to start; pure-Python, no spaCy required.
SKILL_KEYWORDS: Set[str] = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node",
    "django",
    "flask",
    "fastapi",
    "machine learning",
    "deep learning",
    "nlp",
    "ml",
    "pandas",
    "numpy",
    "scikit-learn",
    "sql",
    "nosql",
    "postgresql",
    "mysql",
    "mongodb",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
}

# Map synonyms / related phrases to a canonical skill name
SKILL_SYNONYMS = {
    "nlp": ["natural language processing"],
    "ml": ["machine learning"],
    "fastapi": ["api", "backend api"],
    "python": ["python3"],
}

YEARS_PATTERN = re.compile(r"(\d+)\+?\s+years?")


def extract_skills_and_experience(text: str) -> Tuple[List[str], int]:
    """
    Extract skills and approximate years-of-experience using only
    simple string operations and regex (no heavy NLP libraries).
    """
    lowered = text.lower()
    skills: Set[str] = set()

    # Token-level matching
    tokens = re.findall(r"[a-zA-Z\+\\.]+", lowered)
    for tok in tokens:
        if tok in SKILL_KEYWORDS:
            skills.add(tok)

    # Multi-word skill phrases
    for phrase in SKILL_KEYWORDS:
        if " " in phrase and phrase in lowered:
            skills.add(phrase)

    # Synonym-based matching: map variants back to canonical skills
    for canon, variants in SKILL_SYNONYMS.items():
        for variant in variants:
            if " " in variant:
                if variant in lowered:
                    skills.add(canon)
            else:
                if variant in tokens:
                    skills.add(canon)

    # Estimate years of experience by regex
    years = 0
    for match in YEARS_PATTERN.finditer(lowered):
        try:
            value = int(match.group(1))
            years = max(years, value)
        except ValueError:
            continue

    return sorted(skills), years


def check_resume_quality(text: str) -> Tuple[float, List[str]]:
    """
    Check resume completeness and return quality score (0-100) and issues list.
    """
    issues = []
    score = 100.0
    
    # Check length
    word_count = len(text.split())
    if word_count < 100:
        issues.append("Resume is too short")
        score -= 30
    elif word_count < 200:
        issues.append("Resume could be more detailed")
        score -= 10
    
    # Check for skills section
    lowered = text.lower()
    skill_indicators = ["skills", "technical skills", "competencies", "expertise"]
    if not any(indicator in lowered for indicator in skill_indicators):
        issues.append("No skills section detected")
        score -= 20
    
    # Check for experience
    exp_indicators = ["experience", "work", "employment", "career", "years"]
    if not any(indicator in lowered for indicator in exp_indicators):
        issues.append("No experience section detected")
        score -= 25
    
    # Check for education
    edu_indicators = ["education", "degree", "university", "college", "bachelor", "master"]
    if not any(indicator in lowered for indicator in edu_indicators):
        issues.append("No education section detected")
        score -= 15
    
    return max(0.0, score), issues


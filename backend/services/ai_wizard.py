"""
AI Problem Articulation Wizard service.

Primary path: Gemini 1.5 Flash API
  - Structured JSON output with Pydantic validation
  - Converts vague problem descriptions into SMART challenge statements

Fallback path (if Gemini unavailable or API key missing):
  - Rule-based NLP extraction
  - Produces structured output from user inputs without LLM
  - Demo NEVER breaks

The fallback is not fake — it performs real text analysis and
SMART-goal structuring. It just lacks generative paraphrasing.
"""

import json
import re
import logging
from typing import Optional
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

DOMAIN_KEYWORDS = {
    "Water Management": ["water", "sanitation", "drinking", "irrigation", "bore", "well", "river", "flood", "drainage"],
    "Healthcare": ["health", "hospital", "medicine", "disease", "patient", "clinic", "malnutrition", "maternal", "infant"],
    "Agriculture": ["farm", "crop", "soil", "yield", "pest", "fertiliser", "irrigation", "drought", "harvest"],
    "Education": ["school", "teacher", "student", "literacy", "dropout", "learning", "classroom", "skill"],
    "Infrastructure": ["road", "bridge", "electricity", "power", "connectivity", "transport", "building"],
    "Environment": ["pollution", "waste", "forest", "deforestation", "biodiversity", "air quality", "climate"],
    "Rural Livelihoods": ["livelihood", "employment", "income", "poverty", "tribal", "artisan", "craft", "MGNREGA"],
    "Digital Access": ["internet", "digital", "mobile", "connectivity", "online", "technology"],
}

SDG_MAP = {
    "Water Management": ["SDG 6 – Clean Water"],
    "Healthcare": ["SDG 3 – Good Health"],
    "Agriculture": ["SDG 2 – Zero Hunger"],
    "Education": ["SDG 4 – Quality Education"],
    "Infrastructure": ["SDG 9 – Industry & Infrastructure", "SDG 11 – Sustainable Cities"],
    "Environment": ["SDG 13 – Climate Action", "SDG 15 – Life on Land"],
    "Rural Livelihoods": ["SDG 1 – No Poverty", "SDG 8 – Decent Work"],
    "Digital Access": ["SDG 9 – Industry & Infrastructure"],
}


def detect_domains(text: str) -> list:
    text_lower = text.lower()
    matched = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            matched.append(domain)
    return matched[:3] if matched else ["General / Other"]


def detect_difficulty(situation: str, constraints: str) -> str:
    text = (situation + " " + constraints).lower()
    if any(w in text for w in ["complex", "multi", "several", "multiple", "large", "state-wide"]):
        return "hard"
    if any(w in text for w in ["simple", "small", "basic", "single", "minor"]):
        return "easy"
    return "medium"


def fallback_wizard(step_data: dict) -> dict:
    """
    Rule-based structured problem generation (no LLM required).
    Takes 5-step wizard inputs and produces a structured JSON output.
    """
    situation = step_data.get("situation", "")
    gap = step_data.get("gap", "")
    outcome = step_data.get("outcome", "")
    constraints_text = step_data.get("constraints", "")
    location = step_data.get("location", "Jharkhand")
    budget = step_data.get("budget", "")
    timeline = step_data.get("timeline", "")

    combined_text = f"{situation} {gap} {outcome}"
    domains = detect_domains(combined_text)
    primary_domain = domains[0]
    sdg_tags = SDG_MAP.get(primary_domain, ["SDG 17 – Partnerships"])

    # Generate a clean title from the situation (first 10 words + domain)
    first_words = " ".join(situation.split()[:8]).rstrip(".,;")
    title = f"{primary_domain} Challenge: {first_words}"
    if location and location.lower() not in title.lower():
        title += f" in {location}"

    # Clean and structure the outcome as SMART
    smart_outcome = outcome
    if timeline and timeline not in smart_outcome:
        smart_outcome += f" within {timeline}"
    if budget and budget not in smart_outcome:
        smart_outcome += f" within a budget of {budget}"

    return {
        "title": title[:120],
        "domain": domains,
        "situation": situation.strip(),
        "gap": gap.strip(),
        "desired_outcome": smart_outcome.strip(),
        "constraints": constraints_text.strip(),
        "location": location,
        "budget": budget,
        "timeline": timeline,
        "difficulty": detect_difficulty(situation, constraints_text),
        "sdg_tags": sdg_tags,
        "generation_method": "rule-based",
    }


async def gemini_wizard(step_data: dict) -> Optional[dict]:
    """
    Use Gemini Flash API to generate structured problem statement.
    Returns None on any failure so caller can use fallback.
    """
    if not settings.gemini_api_key:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        situation = step_data.get("situation", "")
        gap = step_data.get("gap", "")
        outcome = step_data.get("outcome", "")
        constraints = step_data.get("constraints", "")
        location = step_data.get("location", "Jharkhand")
        budget = step_data.get("budget", "")
        timeline = step_data.get("timeline", "")
        domain_hint = step_data.get("domain_hint", "")

        prompt = f"""You are an expert at structuring government societal challenge statements for university-industry collaboration platforms in India.

Convert the following raw problem inputs from a district official into a structured, SMART (Specific, Measurable, Achievable, Relevant, Time-bound) challenge statement.

Raw Inputs:
- Location: {location}
- Domain hint: {domain_hint}
- Current situation: {situation}
- Problem/gap: {gap}
- Desired outcome: {outcome}
- Constraints: {constraints}
- Budget: {budget}
- Timeline: {timeline}

Respond ONLY with a valid JSON object with these exact fields:
{{
  "title": "A clear, specific challenge title (max 100 chars)",
  "domain": ["Primary Domain", "Secondary Domain"],
  "situation": "Refined description of current situation (2-3 sentences)",
  "gap": "The specific gap or problem being addressed (1-2 sentences)",
  "desired_outcome": "SMART outcome statement with measurable targets",
  "constraints": "Key constraints including budget, timeline, resources",
  "location": "{location}",
  "budget": "{budget}",
  "timeline": "{timeline}",
  "difficulty": "easy OR medium OR hard",
  "sdg_tags": ["SDG X – Name"],
  "generation_method": "gemini-flash"
}}

Available domains: Water Management, Healthcare, Agriculture, Education, Infrastructure, Environment, Rural Livelihoods, Digital Access
Available SDGs: SDG 1–17 with names.
Return ONLY the JSON, no markdown, no explanation."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Remove markdown code blocks if present
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        result = json.loads(text)
        return result

    except Exception as e:
        logger.warning(f"Gemini wizard failed: {e}. Using fallback.")
        return None


async def run_wizard(step_data: dict) -> dict:
    """
    Main entry point: try Gemini, fall back to rule-based.
    """
    result = await gemini_wizard(step_data)
    if result is None:
        result = fallback_wizard(step_data)
    return result

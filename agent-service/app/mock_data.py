from pathlib import Path

from .models import LearningProfile, ProfileSummary


DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "agent-student-contexts.json"
FALLBACK_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "agent-learning-profiles.json"


def load_profiles() -> list[LearningProfile]:
    source = DATA_FILE if DATA_FILE.exists() else FALLBACK_FILE
    raw = source.read_text(encoding="utf-8")
    return [LearningProfile.model_validate(item) for item in __import__("json").loads(raw)]


def list_profile_summaries() -> list[ProfileSummary]:
    return [
        ProfileSummary(
            id=profile.id,
            studentName=profile.student_name,
            major=profile.major,
            academicYear=profile.academic_year,
            preferredFormats=profile.learning_style.preferred_formats,
            weeklyGoalHours=profile.weekly_goal_hours,
        )
        for profile in load_profiles()
    ]


def get_profile(student_id: str | None) -> LearningProfile:
    profiles = load_profiles()
    if not profiles:
        raise ValueError("No mock learning profiles found")

    if student_id is None:
        return profiles[0]

    for profile in profiles:
        if profile.id == student_id:
            return profile

    raise ValueError(f'Mock student profile "{student_id}" was not found')

import json
import os
from datetime import datetime

from dotenv import load_dotenv

from .mock_data import get_profile
from .models import HabitAnalysis, RecommendedWindow, RoadmapRequest, RoadmapResult, ToolInvocation, ToolOutput

load_dotenv()

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None


WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def get_bucket(dt: datetime) -> str:
    hour = dt.hour
    if hour < 8:
        return "early_morning"
    if hour < 12:
        return "morning"
    if hour < 17:
        return "afternoon"
    if hour < 22:
        return "evening"
    return "late_night"


def label_bucket(bucket: str) -> str:
    return bucket.replace("_", " ")


def recommended_window(bucket: str) -> RecommendedWindow:
    mapping = {
        "early_morning": RecommendedWindow(start="06:30", end="08:00"),
        "morning": RecommendedWindow(start="08:00", end="10:00"),
        "afternoon": RecommendedWindow(start="13:30", end="15:30"),
        "evening": RecommendedWindow(start="19:00", end="21:00"),
        "late_night": RecommendedWindow(start="21:30", end="23:00"),
    }
    return mapping[bucket]


def shift_time(clock: str, delta_minutes: int) -> str:
    hours, minutes = [int(part) for part in clock.split(":")]
    total = (hours * 60 + minutes + delta_minutes) % (24 * 60)
    return f"{total // 60:02d}:{total % 60:02d}"


def analyze_learning_habits(profile) -> HabitAnalysis:
    bucket_breakdown = {
        "early_morning": 0,
        "morning": 0,
        "afternoon": 0,
        "evening": 0,
        "late_night": 0,
    }
    active_days: set[str] = set()
    total_duration = 0
    hours: list[int] = []

    for event in profile.login_history:
        dt = datetime.fromisoformat(event.timestamp)
        bucket = get_bucket(dt)
        bucket_breakdown[bucket] += event.duration_minutes
        total_duration += event.duration_minutes
        hours.append(dt.hour)
        active_days.add(WEEK_ORDER[dt.weekday()])

    preferred_bucket = max(bucket_breakdown.items(), key=lambda item: item[1])[0]
    average_session = round(total_duration / max(len(profile.login_history), 1), 1)
    top_login_hour = round(sum(hours) / max(len(hours), 1))
    consistency_score = min(100, round((len(active_days) / 7) * 55 + min(45, average_session)))

    return HabitAnalysis(
        preferredBucket=preferred_bucket,
        recommendedWindow=recommended_window(preferred_bucket),
        averageSessionMinutes=average_session,
        topLoginHour=top_login_hour,
        consistencyScore=consistency_score,
        bucketBreakdown=bucket_breakdown,
        activeDays=[day for day in WEEK_ORDER if day in active_days],
    )


def default_subjects(profile) -> list[str]:
    return profile.current_courses[:3]


def fallback_tool_sequence(profile, prompt: str | None) -> list[str]:
    sequence: list[str] = []
    preferred = profile.learning_style.preferred_formats
    if "video" in preferred:
        sequence.append("video_recommender")
    if "quiz" in preferred or "practice" in preferred:
        sequence.append("quiz_generator")
    if "qa" in preferred:
        sequence.append("study_qa_coach")
    if prompt and "study_qa_coach" not in sequence:
        sequence.append("study_qa_coach")
    if not sequence:
        sequence = ["video_recommender", "quiz_generator"]
    return sequence[:3]


def _quiz_tool(profile, subject: str) -> ToolInvocation:
    return ToolInvocation(
        tool="quiz_generator",
        purpose=f"Generate a short {subject} drill",
        reason=f"{profile.student_name} responds well to quick checks and includes quiz in preferred formats.",
        output=ToolOutput(
            title=f"{subject} quick quiz",
            items=[
                f"5 multiple-choice questions on the hardest {subject} concept this week.",
                "1 timed reflection question to capture mistakes after the quiz.",
                "Auto-review note: revisit every wrong answer within 10 minutes.",
            ],
        ),
    )


def _video_tool(profile, subject: str) -> ToolInvocation:
    return ToolInvocation(
        tool="video_recommender",
        purpose=f"Recommend a short explainer video for {subject}",
        reason=f"{profile.student_name} prefers visual onboarding before practice.",
        output=ToolOutput(
            title=f"{subject} video path",
            items=[
                f"1 overview video under 12 minutes for {subject}.",
                "1 worked-example clip to watch at 1.25x speed.",
                "Pause prompt: write 3 notes immediately after each segment.",
            ],
        ),
    )


def _qa_tool(profile, subject: str, prompt: str | None) -> ToolInvocation:
    return ToolInvocation(
        tool="study_qa_coach",
        purpose=f"Walk through {subject} questions step by step",
        reason=f"{profile.student_name} benefits from guided reasoning when solving tougher problems.",
        output=ToolOutput(
            title=f"{subject} Q&A coach",
            items=[
                "Break the problem into givens, target, and method before solving.",
                f'Use the student prompt "{prompt}" as the first worked example.' if prompt else "Start with one representative problem and explain the reasoning path.",
                "Finish with one follow-up question the student should solve alone.",
            ],
        ),
    )


def build_tool_invocations(profile, subjects: list[str], tool_sequence: list[str], prompt: str | None) -> list[ToolInvocation]:
    chosen_subjects = subjects or default_subjects(profile)
    tools: list[ToolInvocation] = []
    for index, tool_name in enumerate(tool_sequence):
        subject = chosen_subjects[index % len(chosen_subjects)]
        if tool_name == "video_recommender":
            tools.append(_video_tool(profile, subject))
        elif tool_name == "quiz_generator":
            tools.append(_quiz_tool(profile, subject))
        else:
            tools.append(_qa_tool(profile, subject, prompt))
    return tools


def _safe_json(input_text: str) -> dict | None:
    first = input_text.find("{")
    last = input_text.rfind("}")
    if first == -1 or last == -1 or last <= first:
        return None
    try:
        return json.loads(input_text[first : last + 1])
    except json.JSONDecodeError:
        return None


def plan_with_gemini(profile, analysis: HabitAnalysis, prompt: str | None) -> dict | None:
    if not genai or not os.getenv("GEMINI_API_KEY"):
        return None

    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel(os.getenv("AGENT_GEMINI_MODEL", "gemini-2.5-flash"))
        response = model.generate_content(
            f"""
Return strict JSON only:
{{
  "coachingSummary": "string",
  "toolSequence": ["video_recommender", "quiz_generator", "study_qa_coach"],
  "focusSubjects": ["subject 1", "subject 2"]
}}

Student:
- Name: {profile.student_name}
- Major: {profile.major}
- Courses: {", ".join(profile.current_courses)}
- Interests: {", ".join(profile.interests)}
- Preferred formats: {", ".join(profile.learning_style.preferred_formats)}
- Challenge areas: {", ".join(profile.challenge_areas)}
- Preferred study bucket: {label_bucket(analysis.preferred_bucket)}
- Recommended window: {analysis.recommended_window.start}-{analysis.recommended_window.end}
- Prompt: {prompt or "No extra prompt"}
"""
        )
        parsed = _safe_json(response.text)
        if not parsed:
            return None
        tools = [tool for tool in parsed.get("toolSequence", []) if tool in {"video_recommender", "quiz_generator", "study_qa_coach"}]
        subjects = [subject for subject in parsed.get("focusSubjects", []) if subject]
        if not tools:
            return None
        return {
            "coaching_summary": parsed.get("coachingSummary") or "Gemini planned a structured learning flow.",
            "tool_sequence": tools,
            "focus_subjects": subjects[:3],
        }
    except Exception:
        return None


def build_roadmap(profile, analysis: HabitAnalysis, tools: list[ToolInvocation]) -> list[dict]:
    start = analysis.recommended_window.start
    average_block = max(30, min(75, round(analysis.average_session_minutes)))
    days = analysis.active_days[:4] if analysis.active_days else ["Monday", "Wednesday", "Friday"]
    roadmap: list[dict] = []

    for index, day in enumerate(days):
        first_tool = tools[index % len(tools)]
        second_tool = tools[(index + 1) % len(tools)]
        first_end = shift_time(start, min(average_block, 45))
        second_start = shift_time(first_end, 10)
        second_end = shift_time(second_start, 20)
        roadmap.append(
            {
                "day": day,
                "theme": f"Study around your strongest {label_bucket(analysis.preferred_bucket)} rhythm",
                "blocks": [
                    {
                        "startTime": start,
                        "endTime": first_end,
                        "durationMinutes": min(average_block, 45),
                        "title": first_tool.output.title,
                        "focus": first_tool.purpose,
                        "recommendedTool": first_tool.tool,
                        "format": "video" if first_tool.tool == "video_recommender" else "quiz" if first_tool.tool == "quiz_generator" else "qa",
                        "instructions": first_tool.output.items[0],
                    },
                    {
                        "startTime": second_start,
                        "endTime": second_end,
                        "durationMinutes": 20,
                        "title": "Retention wrap-up",
                        "focus": second_tool.purpose,
                        "recommendedTool": second_tool.tool,
                        "format": "quiz" if second_tool.tool == "quiz_generator" else "video" if second_tool.tool == "video_recommender" else "qa",
                        "instructions": second_tool.output.items[1],
                    },
                ],
            }
        )
    return roadmap


def generate_learning_roadmap(request: RoadmapRequest) -> RoadmapResult:
    profile = get_profile(request.student_id)
    analysis = analyze_learning_habits(profile)
    gemini_plan = plan_with_gemini(profile, analysis, request.prompt)
    tool_sequence = gemini_plan["tool_sequence"] if gemini_plan else fallback_tool_sequence(profile, request.prompt)
    subjects = gemini_plan["focus_subjects"] if gemini_plan else default_subjects(profile)
    tools = build_tool_invocations(profile, subjects, tool_sequence, request.prompt)
    roadmap = build_roadmap(profile, analysis, tools)

    return RoadmapResult(
        student={
            "id": profile.id,
            "name": profile.student_name,
            "major": profile.major,
            "academicYear": profile.academic_year,
        },
        source="gemini_flash" if gemini_plan else "deterministic_fallback",
        analysis=analysis.model_dump(by_alias=True),
        toolInvocations=[tool.model_dump(by_alias=True) for tool in tools],
        roadmap=roadmap,
        coachingNotes=[
            gemini_plan["coaching_summary"]
            if gemini_plan
            else f"{profile.student_name} studies best in the {label_bucket(analysis.preferred_bucket)}, so the roadmap keeps the main work inside {analysis.recommended_window.start}-{analysis.recommended_window.end}.",
            f"Average study session is {analysis.average_session_minutes} minutes, so each plan block stays short enough to match current behavior.",
            f'Priority subjects this week: {", ".join(subjects)}.',
        ],
        generatedAt=datetime.utcnow().isoformat() + "Z",
    )

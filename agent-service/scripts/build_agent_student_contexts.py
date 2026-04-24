import json
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
USERS_FILE = DATA_DIR / "users.json"
PROGRESS_FILE = DATA_DIR / "progress.json"
PROGRESS_REPORTS_FILE = DATA_DIR / "progress-reports.json"
MOCK_AGENT_FILE = DATA_DIR / "agent-learning-profiles.json"
OUTPUT_FILE = DATA_DIR / "agent-student-contexts.json"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def unique(items):
    seen = set()
    ordered = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def classify_task_type(subject: str, topic: str, score):
    text = f"{subject} {topic}".lower()
    if score is not None and score < 7:
        return "quiz"
    if any(keyword in text for keyword in ["cơ sở dữ liệu", "database", "sql", "lập trình", "python", "c/c++"]):
        return "practice"
    if any(keyword in text for keyword in ["tiếng anh", "english", "mạng", "network", "vật lý"]):
        return "video"
    return "qa"


def infer_learning_style(student, report_entry, progress_entries, template):
    preferred_formats = list(template["learningStyle"]["preferredFormats"])
    average_score = report_entry.get("averageScore", 0) if report_entry else 0
    attendance_rate = report_entry.get("attendanceRate", 0) if report_entry else 0

    if average_score and average_score < 7 and "quiz" not in preferred_formats:
        preferred_formats.insert(0, "quiz")
    if attendance_rate and attendance_rate < 50 and "video" not in preferred_formats:
        preferred_formats.append("video")
    if any("ChatGPT" in challenge for entry in progress_entries for challenge in entry.get("challenges", [])):
        if "qa" not in preferred_formats:
            preferred_formats.insert(0, "qa")
    if any("Lập trình" in entry.get("subject", "") or "Python" in entry.get("subject", "") for entry in progress_entries):
        if "practice" not in preferred_formats:
            preferred_formats.insert(0, "practice")

    return {
        "preferredFormats": unique(preferred_formats)[:3],
        "pace": template["learningStyle"]["pace"],
        "likesShortBursts": template["learningStyle"]["likesShortBursts"],
    }


def build_recent_tasks(progress_entries):
    recent = []
    for entry in sorted(progress_entries, key=lambda item: item.get("createdAt", ""), reverse=True)[:3]:
        status = "completed" if entry.get("score") is not None else "in_progress"
        recent.append(
            {
                "subject": entry.get("subject", "General Study"),
                "type": classify_task_type(entry.get("subject", ""), entry.get("topic", ""), entry.get("score")),
                "status": status,
            }
        )
    return recent


def build_current_courses(student, report_entry, progress_entries):
    report_subjects = [subject.get("subject") for subject in report_entry.get("subjects", [])] if report_entry else []
    progress_subjects = [entry.get("subject") for entry in progress_entries]
    return unique(report_subjects + progress_subjects + student.get("preferredSubjects", []) + student.get("interests", []))[:5]


def build_challenge_areas(report_entry, progress_entries):
    report_challenges = report_entry.get("challenges", []) if report_entry else []
    progress_challenges = [challenge for entry in progress_entries for challenge in entry.get("challenges", [])]
    return unique(report_challenges + progress_challenges)[:5]


def build_weekly_goal_hours(report_entry, progress_entries):
    if report_entry:
        sessions_total = report_entry.get("sessionsTotal", 0)
        completed = report_entry.get("sessionsCompleted", 0)
        return max(6, min(14, sessions_total * 2 + completed))
    return max(6, min(12, len(progress_entries) * 2 or 8))


def build_login_history(student, template, progress_entries):
    history = deepcopy(template["loginHistory"])
    progress_dates = sorted(
        [entry.get("createdAt") for entry in progress_entries if entry.get("createdAt")],
        reverse=True,
    )
    for index, timestamp in enumerate(progress_dates[: len(history)]):
        history[index]["timestamp"] = timestamp
    return history


def main():
    users = load_json(USERS_FILE)
    progress = load_json(PROGRESS_FILE)
    reports = load_json(PROGRESS_REPORTS_FILE)
    mock_profiles = load_json(MOCK_AGENT_FILE)

    report_students = {}
    for report in reports:
        for student in report.get("data", {}).get("students", []):
            report_students[student["studentId"]] = student

    mock_templates = mock_profiles or []
    if not mock_templates:
        raise RuntimeError("agent-learning-profiles.json must contain at least one template")

    student_users = [user for user in users if user.get("role") == "student"]
    merged_contexts = []

    for index, student in enumerate(student_users):
        student_progress = [entry for entry in progress if entry.get("studentId") == student["id"]]
        report_entry = report_students.get(student["id"], {})
        template = mock_templates[index % len(mock_templates)]

        merged_contexts.append(
            {
                "id": student["id"],
                "studentName": student.get("name", "Student"),
                "major": student.get("major", "Undeclared"),
                "academicYear": student.get("year", 1),
                "interests": unique(student.get("interests", []) + student.get("preferredSubjects", []))[:6],
                "currentCourses": build_current_courses(student, report_entry, student_progress),
                "challengeAreas": build_challenge_areas(report_entry, student_progress) or template["challengeAreas"],
                "weeklyGoalHours": build_weekly_goal_hours(report_entry, student_progress),
                "learningStyle": infer_learning_style(student, report_entry, student_progress, template),
                "loginHistory": build_login_history(student, template, student_progress),
                "recentTasks": build_recent_tasks(student_progress)
                or [
                    {
                        "subject": subject,
                        "type": template["recentTasks"][task_index % len(template["recentTasks"])]["type"],
                        "status": "pending",
                    }
                    for task_index, subject in enumerate(build_current_courses(student, report_entry, student_progress)[:3])
                ],
                "derivedFrom": {
                    "userId": student["id"],
                    "progressEntries": len(student_progress),
                    "hasProgressReport": bool(report_entry),
                    "templateSeed": template["id"],
                },
            }
        )

    OUTPUT_FILE.write_text(json.dumps(merged_contexts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(merged_contexts)} agent contexts to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

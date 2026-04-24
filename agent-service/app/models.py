from typing import Literal

from pydantic import BaseModel, Field


LearningFormat = Literal["video", "quiz", "reading", "practice", "qa"]
TimeBucket = Literal["early_morning", "morning", "afternoon", "evening", "late_night"]
ToolName = Literal["quiz_generator", "video_recommender", "study_qa_coach"]


class LoginEvent(BaseModel):
    timestamp: str
    duration_minutes: int = Field(alias="durationMinutes")
    device: str


class RecentTask(BaseModel):
    subject: str
    type: LearningFormat
    status: Literal["completed", "in_progress", "pending"]


class LearningStyle(BaseModel):
    preferred_formats: list[LearningFormat] = Field(alias="preferredFormats")
    pace: str
    likes_short_bursts: bool = Field(alias="likesShortBursts")


class LearningProfile(BaseModel):
    id: str
    student_name: str = Field(alias="studentName")
    major: str
    academic_year: int = Field(alias="academicYear")
    interests: list[str]
    current_courses: list[str] = Field(alias="currentCourses")
    challenge_areas: list[str] = Field(alias="challengeAreas")
    weekly_goal_hours: int = Field(alias="weeklyGoalHours")
    learning_style: LearningStyle = Field(alias="learningStyle")
    login_history: list[LoginEvent] = Field(alias="loginHistory")
    recent_tasks: list[RecentTask] = Field(alias="recentTasks")


class RecommendedWindow(BaseModel):
    start: str
    end: str


class HabitAnalysis(BaseModel):
    preferred_bucket: TimeBucket = Field(alias="preferredBucket")
    recommended_window: RecommendedWindow = Field(alias="recommendedWindow")
    average_session_minutes: float = Field(alias="averageSessionMinutes")
    top_login_hour: int = Field(alias="topLoginHour")
    consistency_score: int = Field(alias="consistencyScore")
    bucket_breakdown: dict[TimeBucket, int] = Field(alias="bucketBreakdown")
    active_days: list[str] = Field(alias="activeDays")


class ToolOutput(BaseModel):
    title: str
    items: list[str]


class ToolInvocation(BaseModel):
    tool: ToolName
    purpose: str
    reason: str
    output: ToolOutput


class RoadmapBlock(BaseModel):
    start_time: str = Field(alias="startTime")
    end_time: str = Field(alias="endTime")
    duration_minutes: int = Field(alias="durationMinutes")
    title: str
    focus: str
    recommended_tool: ToolName = Field(alias="recommendedTool")
    format: LearningFormat
    instructions: str


class RoadmapDay(BaseModel):
    day: str
    theme: str
    blocks: list[RoadmapBlock]


class StudentSummary(BaseModel):
    id: str
    name: str
    major: str
    academic_year: int = Field(alias="academicYear")


class RoadmapResult(BaseModel):
    student: StudentSummary
    source: Literal["gemini_flash", "deterministic_fallback"]
    analysis: HabitAnalysis
    tool_invocations: list[ToolInvocation] = Field(alias="toolInvocations")
    roadmap: list[RoadmapDay]
    coaching_notes: list[str] = Field(alias="coachingNotes")
    generated_at: str = Field(alias="generatedAt")


class ProfileSummary(BaseModel):
    id: str
    student_name: str = Field(alias="studentName")
    major: str
    academic_year: int = Field(alias="academicYear")
    preferred_formats: list[LearningFormat] = Field(alias="preferredFormats")
    weekly_goal_hours: int = Field(alias="weeklyGoalHours")


class RoadmapRequest(BaseModel):
    student_id: str | None = Field(default=None, alias="studentId")
    prompt: str | None = None


class ApiEnvelope(BaseModel):
    success: bool
    data: dict | list | None = None
    error: str | None = None

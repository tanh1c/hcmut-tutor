from typing import Any, Literal

from pydantic import BaseModel, Field


LearningFormat = Literal["video", "quiz", "reading", "practice", "qa"]
TimeBucket = Literal["early_morning", "morning", "afternoon", "evening", "late_night"]
ToolName = Literal["quiz_generator", "video_recommender", "study_qa_coach"]
ChatToolName = Literal["document_to_text", "problem_solver", "quiz_generator", "video_recommender"]


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


class AgentDocument(BaseModel):
    id: str
    name: str
    mime_type: str = Field(alias="mimeType")
    size: int
    uploaded_at: str = Field(alias="uploadedAt")
    extraction_status: Literal["pending", "ready"] = Field(alias="extractionStatus")
    extracted_text_preview: str | None = Field(default=None, alias="extractedTextPreview")
    raw_text: str | None = Field(default=None, alias="rawText")
    server_file_path: str | None = Field(default=None, alias="serverFilePath")


class AgentDocumentUploadItem(BaseModel):
    name: str
    mime_type: str = Field(alias="mimeType")
    size: int
    text_content: str | None = Field(default=None, alias="textContent")
    content_base64: str | None = Field(default=None, alias="contentBase64")


class AgentDocumentUploadRequest(BaseModel):
    student_id: str | None = Field(default=None, alias="studentId")
    documents: list[AgentDocumentUploadItem]


class AgentReasoningStep(BaseModel):
    title: str
    detail: str


class AgentToolDecision(BaseModel):
    selected_tool: ChatToolName = Field(alias="selectedTool")
    rationale: str
    confidence: float
    considered_signals: list[str] = Field(alias="consideredSignals")
    execution_plan: list[str] = Field(alias="executionPlan")
    reasoning_trace: list[AgentReasoningStep] = Field(alias="reasoningTrace")
    execution_status: Literal["planned", "placeholder_pending"] = Field(alias="executionStatus")
    source: Literal["langgraph_gemini", "langgraph_deterministic"]
    needs_document_text: bool = Field(alias="needsDocumentText")


class AgentToolExecution(BaseModel):
    tool: ChatToolName
    summary: str
    output: str
    citations: list[str] = []
    status: Literal["completed", "partial", "placeholder_pending"]


class AgentTutoringProgress(BaseModel):
    mode: Literal["guided"]
    current_part: str = Field(alias="currentPart")
    current_step_index: int = Field(alias="currentStepIndex")
    total_steps: int = Field(alias="totalSteps")
    awaiting_confirmation: bool = Field(alias="awaitingConfirmation")
    next_action_hint: str = Field(alias="nextActionHint")


class AgentChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: str = Field(alias="createdAt")
    meta: dict[str, Any] | None = None


class AgentChatSessionSummary(BaseModel):
    id: str
    title: str
    student_id: str | None = Field(default=None, alias="studentId")
    student_name: str | None = Field(default=None, alias="studentName")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    document_count: int = Field(alias="documentCount")


class AgentChatSessionState(BaseModel):
    session: AgentChatSessionSummary
    documents: list[AgentDocument]
    messages: list[AgentChatMessage]
    latest_decision: AgentToolDecision | None = Field(default=None, alias="latestDecision")
    latest_execution: AgentToolExecution | None = Field(default=None, alias="latestExecution")
    tutoring_progress: AgentTutoringProgress | None = Field(default=None, alias="tutoringProgress")


class AgentChatSessionCreateRequest(BaseModel):
    student_id: str | None = Field(default=None, alias="studentId")
    title: str | None = None


class AgentChatMessageRequest(BaseModel):
    student_id: str | None = Field(default=None, alias="studentId")
    message: str


class AgentStreamEvent(BaseModel):
    type: Literal["status", "graph_update", "tool_selected", "tool_result", "session_state", "error"]
    message: str
    node: str | None = None
    decision: AgentToolDecision | None = None
    execution: AgentToolExecution | None = None
    session: AgentChatSessionState | None = None


class ApiEnvelope(BaseModel):
    success: bool
    data: dict | list | None = None
    error: str | None = None

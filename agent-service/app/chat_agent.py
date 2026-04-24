import os
import base64
from collections.abc import Generator
from datetime import datetime, timezone
import re
from typing import Any, Literal, TypedDict
from uuid import uuid4
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from .checkpoint_store import checkpoint_store
from .document_to_text_tool import PdfToMarkdownError, convert_pdf_to_markdown
from .memory_store import memory_store
from .mock_data import get_profile
from .models import (
    AgentChatMessage,
    AgentChatMessageRequest,
    AgentChatSessionCreateRequest,
    AgentChatSessionState,
    AgentChatSessionSummary,
    AgentDocument,
    AgentDocumentUploadRequest,
    AgentReasoningStep,
    AgentStreamEvent,
    AgentToolDecision,
    AgentToolExecution,
    AgentTutoringProgress,
)

try:
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:  # pragma: no cover
    ChatGoogleGenerativeAI = None
    HumanMessage = None
    SystemMessage = None


_chat_workflow = None
RUNTIME_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "runtime_uploads"


class ChatWorkflowState(TypedDict, total=False):
    profile: Any
    documents: list[AgentDocument]
    latest_message: str
    intent: str
    has_documents: bool
    pending_text: bool
    requested_tool_hints: list[str]
    candidate_tool: str
    llm_available: bool
    decision: AgentToolDecision
    execution: AgentToolExecution
    assistant_message: str
    tutoring_state: dict[str, Any] | None
    tutoring_progress: AgentTutoringProgress | None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _session_summary(record: dict[str, Any]) -> AgentChatSessionSummary:
    return AgentChatSessionSummary.model_validate(
        {
            "id": record["id"],
            "title": record["title"],
            "studentId": record.get("student_id"),
            "studentName": record.get("student_name"),
            "createdAt": record["created_at"],
            "updatedAt": record["updated_at"],
            "documentCount": len(record["documents"]),
        }
    )


def _session_state(record: dict[str, Any]) -> AgentChatSessionState:
    return AgentChatSessionState(
        session=_session_summary(record),
        documents=record["documents"],
        messages=record["messages"],
        latestDecision=record.get("latest_decision"),
        latestExecution=record.get("latest_execution"),
        tutoringProgress=record.get("tutoring_progress"),
    )


def list_chat_sessions() -> list[AgentChatSessionSummary]:
    sessions = [_session_summary(record) for record in memory_store.list_chat_sessions()]
    return sorted(sessions, key=lambda session: session.updated_at, reverse=True)


def create_chat_session(request: AgentChatSessionCreateRequest) -> AgentChatSessionState:
    created_at = now_iso()
    student_name = None

    if request.student_id:
        try:
            student_name = get_profile(request.student_id).student_name
        except ValueError:
            student_name = None

    title = request.title or f"{student_name or 'Agent'} workspace"
    session_id = f"chat_{uuid4().hex[:12]}"
    record = {
        "id": session_id,
        "title": title,
        "student_id": request.student_id,
        "student_name": student_name,
        "created_at": created_at,
        "updated_at": created_at,
        "documents": [],
        "messages": [
            AgentChatMessage(
                id=f"msg_{uuid4().hex[:12]}",
                role="system",
                content="Upload PDFs or images first, then ask the agent what to do with them.",
                createdAt=created_at,
                meta={"kind": "session_bootstrap"},
            )
        ],
        "latest_decision": None,
        "latest_execution": None,
        "tutoring_state": None,
        "tutoring_progress": None,
    }
    memory_store.save_chat_session(record)
    return _session_state(record)


def _persist_uploaded_file(name: str, content_base64: str) -> str:
    RUNTIME_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._") or "upload.bin"
    target_path = RUNTIME_UPLOAD_DIR / f"{uuid4().hex[:12]}_{safe_name}"
    target_path.write_bytes(base64.b64decode(content_base64))
    return str(target_path)


def get_chat_session(session_id: str) -> AgentChatSessionState:
    record = memory_store.get_chat_session(session_id)
    if not record:
        raise ValueError(f'Chat session "{session_id}" was not found')
    return _session_state(record)


def upload_session_documents(session_id: str, request: AgentDocumentUploadRequest) -> AgentChatSessionState:
    record = memory_store.get_chat_session(session_id)
    if not record:
        raise ValueError(f'Chat session "{session_id}" was not found')

    print(f"[DEBUG] Uploading documents to session {session_id}")
    print(f"[DEBUG] Request has {len(request.documents)} documents")
    print(f"[DEBUG] Current session has {len(record['documents'])} documents before upload")

    if request.student_id and not record.get("student_id"):
        record["student_id"] = request.student_id
        try:
            record["student_name"] = get_profile(request.student_id).student_name
        except ValueError:
            record["student_name"] = None

    uploaded_at = now_iso()
    for item in request.documents:
        print(f"[DEBUG] Adding document: {item.name}, size: {item.size}, has_content: {bool(item.text_content or item.content_base64)}")
        record["documents"].append(
            AgentDocument(
                id=f"doc_{uuid4().hex[:12]}",
                name=item.name,
                mimeType=item.mime_type,
                size=item.size,
                uploadedAt=uploaded_at,
                extractionStatus="ready" if item.text_content else "pending",
                extractedTextPreview=(item.text_content or "")[:240] or None,
                rawText=item.text_content,
                serverFilePath=_persist_uploaded_file(item.name, item.content_base64) if item.content_base64 else None,
            )
        )

    print(f"[DEBUG] Session now has {len(record['documents'])} documents after upload")
    record["updated_at"] = uploaded_at
    record["messages"].append(
        AgentChatMessage(
            id=f"msg_{uuid4().hex[:12]}",
            role="system",
            content=f"{len(request.documents)} document(s) attached. Text extraction is still pending implementation.",
            createdAt=uploaded_at,
            meta={"kind": "document_upload"},
        )
    )
    memory_store.save_chat_session(record)
    print(f"[DEBUG] Session saved, verifying: {len(record['documents'])} documents")
    return _session_state(record)


def _langchain_client():
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("AGENT_CHAT_MODEL", os.getenv("AGENT_GEMINI_MODEL", "gemini-2.5-flash"))

    if not api_key or not ChatGoogleGenerativeAI:
        return None, model_name

    return (
        ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.2,
        ),
        model_name,
    )


def _available_document_text(documents: list[AgentDocument]) -> tuple[str, list[str]]:
    chunks: list[str] = []
    citations: list[str] = []
    for document in documents:
        if document.raw_text:
            text = document.raw_text.strip()
            if text:
                chunks.append(f"[{document.name}]\n{text}")
                citations.append(document.name)
        elif document.extracted_text_preview:
            preview = document.extracted_text_preview.strip()
            if preview:
                chunks.append(f"[{document.name} preview]\n{preview}")
                citations.append(document.name)
    return "\n\n".join(chunks), citations


def _problem_source_text(message: str, documents: list[AgentDocument]) -> str:
    document_text, _ = _available_document_text(documents)
    return document_text if document_text else message


def _is_progression_message(message: str) -> bool:
    normalized = message.strip().lower()
    if not normalized:
        return False

    progression_phrases = [
        "ok",
        "okay",
        "continue",
        "go on",
        "next",
        "next step",
        "move on",
        "tiếp",
        "tiep",
        "ổn",
        "on roi",
    ]
    return normalized in progression_phrases or normalized.startswith("continue ") or normalized.startswith("next ")


def _extract_requested_part(message: str) -> str | None:
    lowered = message.lower()
    patterns = [
        r"\bpart\s*([a-z])\b",
        r"\bquestion\s*([a-z])\b",
        r"\bc[aâ]u\s*([a-z0-9])\b",
        r"\b([a-z])\)",
    ]
    for pattern in patterns:
        match = re.search(pattern, lowered)
        if match:
            return match.group(1)
    return None


def _extract_problem_parts(problem_text: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"(?im)^\s*([a-z])\)\s*(.+?)(?=^\s*[a-z]\)\s*|\Z)", problem_text, flags=re.S))
    if not matches:
        return [("main", problem_text.strip())] if problem_text.strip() else []

    parts: list[tuple[str, str]] = []
    for match in matches:
        label = match.group(1).lower()
        content = match.group(2).strip()
        parts.append((label, content))
    return parts


def _default_guided_steps(part_label: str, part_text: str) -> list[str]:
    lowered = part_text.lower()
    if any(keyword in lowered for keyword in ["derive", "value assigned", "equation for", "solve for"]):
        return [
            f"Identify exactly what {part_label}) is asking for and which variable must be isolated.",
            "Write the fitting objective for model 2 while treating every other coefficient as fixed if the prompt allows it.",
            "Differentiate the objective with respect to the target variable and set the derivative to zero.",
            "Rearrange the equation into a clean final expression and check what depends on the data versus on the fixed coefficient.",
        ]
    if any(keyword in lowered for keyword in ["training data", "fit the training"]):
        return [
            f"Restate what {part_label}) asks about training-set fit.",
            "Compare model flexibility: which model has more parameters and can reduce training error more easily.",
            "Explain why lower training error does not automatically mean better generalization.",
        ]
    if any(keyword in lowered for keyword in ["test data", "generalize", "fit the test"]):
        return [
            f"Restate what {part_label}) asks about test-set performance.",
            "Discuss bias-variance tradeoff between the simpler and more flexible model.",
            "State the most defensible answer and explain why the test winner cannot be guaranteed from flexibility alone.",
        ]
    return [
        f"Restate the target of {part_label}).",
        "Identify the relevant concept or formula.",
        "Work through the reasoning carefully.",
        "Summarize the conclusion in one clean statement.",
    ]


def _build_tutoring_state(message: str, documents: list[AgentDocument]) -> dict[str, Any]:
    source_text = _problem_source_text(message, documents)
    parts = _extract_problem_parts(source_text)
    requested = _extract_requested_part(message)

    selected_index = 0
    if requested:
        for index, (label, _content) in enumerate(parts):
            if label == requested.lower():
                selected_index = index
                break

    selected_label, selected_content = parts[selected_index] if parts else ("main", source_text.strip())
    step_goals = _default_guided_steps(selected_label, selected_content)

    return {
        "problem_text": source_text,
        "parts": [{"label": label, "content": content} for label, content in parts],
        "current_part_index": selected_index,
        "current_step_index": 0,
        "step_goals": step_goals,
        "awaiting_confirmation": True,
        "mode": "guided",
    }


def _tutoring_progress_from_state(tutoring_state: dict[str, Any] | None) -> AgentTutoringProgress | None:
    if not tutoring_state:
        return None

    current_part = tutoring_state["parts"][tutoring_state["current_part_index"]]["label"] if tutoring_state.get("parts") else "main"
    current_step = tutoring_state.get("current_step_index", 0)
    total_steps = len(tutoring_state.get("step_goals", []))

    return AgentTutoringProgress(
        mode="guided",
        currentPart=current_part,
        currentStepIndex=current_step,
        totalSteps=total_steps,
        awaitingConfirmation=tutoring_state.get("awaiting_confirmation", False),
        nextActionHint=(
            "Reply with `ok` or `continue` when this step is clear and you want the next one."
            if current_step < total_steps
            else "Review this part, then ask for the next part or request a quiz/video follow-up."
        ),
    )


def _build_plan(selected_tool: str) -> list[str]:
    return {
        "document_to_text": [
            "Keep the uploaded PDF/image files in the chat workspace.",
            "Wait for the OCR or parser tool to be connected.",
            "When text is available, chunk it and expose citation-ready passages to downstream tools.",
        ],
        "problem_solver": [
            "Use the student question as the main task input.",
            "Once document text is ready, ground the solution on extracted content when relevant.",
            "Return a step-by-step explanation, then propose one follow-up exercise.",
        ],
        "quiz_generator": [
            "Extract the main concepts from the uploaded material or latest prompt.",
            "Generate a short quiz set with answers and mistake-focused review points.",
            "Keep the difficulty aligned with the student's current challenge areas.",
        ],
        "video_recommender": [
            "Identify the target concept from the question or uploaded material.",
            "Recommend short, concept-first videos before deeper practice.",
            "Attach note-taking prompts so the student can convert watching into recall.",
        ],
    }[selected_tool]


def _infer_intent(message: str) -> tuple[str, list[str]]:
    lowered = message.lower()
    hints: list[str] = []
    intent = "document_intake"

    if any(keyword in lowered for keyword in ["quiz", "mcq", "practice", "multiple choice"]):
        hints.append("quiz_generator")
        intent = "quiz_request"
    if any(keyword in lowered for keyword in ["video", "youtube", "watch", "clip"]):
        hints.append("video_recommender")
        intent = "video_request"
    if any(keyword in lowered for keyword in ["solve", "equation", "proof", "problem", "bai", "exercise", "giai", "question"]):
        hints.append("problem_solver")
        intent = "problem_solving"
    if any(keyword in lowered for keyword in ["pdf", "image", "ocr", "extract", "text", "read"]):
        hints.append("document_to_text")
        if intent == "document_intake":
            intent = "document_parsing"

    deduped: list[str] = []
    for hint in hints:
        if hint not in deduped:
            deduped.append(hint)

    return intent, deduped


def _deterministic_decision_from_state(state: ChatWorkflowState) -> AgentToolDecision:
    message = state["latest_message"]
    documents = state["documents"]
    profile = state["profile"]
    pending_text = state["pending_text"]
    has_documents = state["has_documents"]
    candidate_tool = state.get("candidate_tool") or "problem_solver"

    if pending_text and has_documents and candidate_tool != "document_to_text":
        rationale = "A content-action tool was requested, but the uploaded files still need text extraction before they can be fully grounded."
        execution_status = "placeholder_pending"
    elif candidate_tool == "document_to_text":
        rationale = "The session already has uploaded files, so the next workflow step is to convert them into usable text chunks."
        execution_status = "placeholder_pending"
    elif candidate_tool == "problem_solver":
        rationale = "The latest message asks for explanation or problem solving, so the workflow should prepare a worked-solution step next."
        execution_status = "planned"
    elif candidate_tool == "quiz_generator":
        rationale = "The latest message explicitly asks for retrieval practice, so quiz generation is the best next tool."
        execution_status = "placeholder_pending"
    else:
        rationale = "The latest message points to learning by watching, so video recommendation is the best follow-up tool."
        execution_status = "placeholder_pending"

    signals = [
        f"Student profile: {profile.student_name} in {profile.major}",
        f"Preferred formats: {', '.join(profile.learning_style.preferred_formats)}",
        f"Intent label: {state['intent']}",
        f"Documents attached: {len(documents)}",
        f"Pending text extraction: {'yes' if pending_text else 'no'}",
        f"Latest user intent: {message.strip()}",
    ]

    reasoning_trace = [
        AgentReasoningStep(title="Ingest context", detail=f"Loaded the student profile and {len(documents)} uploaded file(s) into the graph state."),
        AgentReasoningStep(title="Classify intent", detail=f'The workflow labeled the latest request as "{state["intent"]}" with tool hints: {", ".join(state["requested_tool_hints"]) or "none"}.'), 
        AgentReasoningStep(
            title="Select tool",
            detail=f"{candidate_tool} was selected because it best matches the current request without ignoring the attached learning materials.",
        ),
    ]

    return AgentToolDecision(
        selectedTool=candidate_tool,
        rationale=rationale,
        confidence=0.62 if execution_status == "placeholder_pending" else 0.74,
        consideredSignals=signals,
        executionPlan=_build_plan(candidate_tool),
        reasoningTrace=reasoning_trace,
        executionStatus=execution_status,
        source="langgraph_deterministic",
        needsDocumentText=pending_text and has_documents,
    )


def _langgraph_model_decision(state: ChatWorkflowState) -> AgentToolDecision | None:
    llm, model_name = _langchain_client()
    if llm is None or HumanMessage is None or SystemMessage is None:
        return None

    class ToolPlanSchema(AgentToolDecision):
        pass

    documents = state["documents"]
    profile = state["profile"]
    message = state["latest_message"]
    docs_summary = [
        {
            "name": document.name,
            "mimeType": document.mime_type,
            "size": document.size,
            "extractionStatus": document.extraction_status,
        }
        for document in documents
    ]

    try:
        structured_llm = llm.with_structured_output(ToolPlanSchema)
        decision = structured_llm.invoke(
            [
                SystemMessage(
                    content=(
                        "You are the orchestration layer for a tutoring agent workflow.\n"
                        "You are running inside a LangGraph workflow.\n"
                        "Choose exactly one tool for the next step.\n"
                        "If a PDF/image document is attached and text is still unavailable, you must choose document_to_text first.\n"
                        "Do not claim that OCR, quiz generation, or video retrieval has already happened when it has not.\n"
                        "Reasoning trace must be concise, safe, and user-visible. It should summarize signals, not hidden chain-of-thought.\n"
                        "When no document preprocessing is required, select the tool purely from the user's current request: solve -> problem_solver, quiz -> quiz_generator, video -> video_recommender.\n"
                    )
                ),
                HumanMessage(
                    content=(
                        f"Student: {profile.student_name}\n"
                        f"Major: {profile.major}\n"
                        f"Challenge areas: {', '.join(profile.challenge_areas)}\n"
                        f"Preferred formats: {', '.join(profile.learning_style.preferred_formats)}\n"
                        f"Current courses: {', '.join(profile.current_courses)}\n"
                        f"Intent label from graph: {state['intent']}\n"
                        f"Tool hints from graph: {state['requested_tool_hints']}\n"
                        f"Documents: {docs_summary}\n"
                        f"Latest user message: {message}\n"
                        f"Model tag for logging only: {model_name}"
                    )
                ),
            ]
        )
        return decision.model_copy(update={"source": "langgraph_gemini"})
    except Exception:
        return None


def _solve_problem_with_llm(profile, message: str, documents: list[AgentDocument]) -> AgentToolExecution | None:
    llm, _model_name = _langchain_client()
    if llm is None or HumanMessage is None or SystemMessage is None:
        return None

    document_text, citations = _available_document_text(documents)
    try:
        response = llm.invoke(
            [
                SystemMessage(
                    content=(
                        "You are a tutoring assistant. Solve the student's request step by step.\n"
                        "Ground the answer on provided document text when available.\n"
                        "If the question references a numbered exercise like 'question 1', explain the reasoning clearly and keep the answer practical.\n"
                    )
                ),
                HumanMessage(
                    content=(
                        f"Student: {profile.student_name}\n"
                        f"Major: {profile.major}\n"
                        f"Request: {message}\n"
                        f"Document text:\n{document_text or 'No extracted document text provided.'}"
                    )
                ),
            ]
        )
        text = getattr(response, "content", "") or ""
        if isinstance(text, list):
            text = "\n".join(str(item) for item in text)
        if not str(text).strip():
            return None
        return AgentToolExecution(
            tool="problem_solver",
            summary="Generated a worked solution from the available prompt and document context.",
            output=str(text).strip(),
            citations=citations,
            status="completed" if document_text else "partial",
        )
    except Exception:
        return None


def _guided_step_with_llm(profile, part_label: str, part_text: str, step_goal: str, documents: list[AgentDocument]) -> str | None:
    llm, _model_name = _langchain_client()
    if llm is None or HumanMessage is None or SystemMessage is None:
        return None

    document_text, _citations = _available_document_text(documents)
    try:
        response = llm.invoke(
            [
                SystemMessage(
                    content=(
                        "You are a tutoring coach. Give only the current step, not the full solution.\n"
                        "Use markdown.\n"
                        "Keep the explanation focused, concrete, and short enough for an interactive tutoring flow.\n"
                        "End by asking whether this step is clear and invite the student to reply with ok/continue before the next step.\n"
                    )
                ),
                HumanMessage(
                    content=(
                        f"Student: {profile.student_name}\n"
                        f"Major: {profile.major}\n"
                        f"Current part: {part_label})\n"
                        f"Part text: {part_text}\n"
                        f"Current step goal: {step_goal}\n"
                        f"User request: {message}\n"
                        f"Document text:\n{document_text or 'No extracted document text provided.'}"
                    )
                ),
            ]
        )
        text = getattr(response, "content", "") or ""
        if isinstance(text, list):
            text = "\n".join(str(item) for item in text)
        return str(text).strip() or None
    except Exception:
        return None


def _fallback_guided_step(part_label: str, step_index: int, step_goal: str, part_text: str) -> str:
    intro = f"### Guided solution for {part_label})\n\n"
    return (
        f"{intro}"
        f"**Step {step_index + 1}:** {step_goal}\n\n"
        f"Focus on this part of the prompt:\n\n> {part_text[:400]}\n\n"
        "If this step looks good, reply with `ok` or `continue` and I will move to the next step."
    )


def _run_guided_problem_solver(
    profile,
    message: str,
    documents: list[AgentDocument],
    tutoring_state: dict[str, Any] | None,
) -> tuple[AgentToolExecution, str, dict[str, Any] | None]:
    if tutoring_state and _is_progression_message(message):
        next_state = dict(tutoring_state)
        next_state["current_step_index"] = next_state.get("current_step_index", 0) + 1
    else:
        next_state = _build_tutoring_state(message, documents)

    parts = next_state.get("parts", [])
    part_index = next_state.get("current_part_index", 0)
    current_part = parts[part_index] if parts else {"label": "main", "content": _problem_source_text(message, documents)}
    step_goals = next_state.get("step_goals", [])
    step_index = next_state.get("current_step_index", 0)

    if step_index >= len(step_goals):
        next_state["awaiting_confirmation"] = False
        current_label = current_part["label"]
        next_part_index = part_index + 1
        if next_part_index < len(parts):
            next_label = parts[next_part_index]["label"]
            markdown = (
                f"### {current_label}) is complete\n\n"
                f"We have finished the guided steps for **{current_label})**.\n\n"
                "#### Quick review\n\n"
                f"- You have completed the current walkthrough for **{current_label})**.\n"
                "- If anything feels unclear, ask me to re-explain this part before moving on.\n\n"
                "#### Suggested next actions\n\n"
                f"- Reply with `continue` to move to **{next_label})**.\n"
                f"- Ask me to **create a quiz for part {current_label}**.\n"
                f"- Ask me to **make a short video plan for part {current_label}**.\n"
            )
        else:
            markdown = (
                "### Guided section complete\n\n"
                "We have finished the current guided walkthrough.\n\n"
                "#### Quick review\n\n"
                "- The current problem walkthrough is complete.\n"
                "- If you want, I can still revisit any earlier step and explain it more slowly.\n\n"
                "#### Suggested next actions\n\n"
                "- Ask for the **next question**.\n"
                "- Ask me to **create a quiz** from this problem.\n"
                "- Ask me to **make a short video learning plan** for this topic.\n"
            )
        execution = AgentToolExecution(
            tool="problem_solver",
            summary=f"Completed the guided walkthrough for {current_label}).",
            output=markdown,
            citations=[],
            status="completed",
        )
        return execution, markdown, next_state

    step_goal = step_goals[step_index]
    part_label = current_part["label"]
    part_text = current_part["content"]
    markdown = _guided_step_with_llm(profile, part_label, part_text, step_goal, documents)
    if markdown is None:
        markdown = _fallback_guided_step(part_label, step_index, step_goal, part_text)

    next_state["awaiting_confirmation"] = True
    execution = AgentToolExecution(
        tool="problem_solver",
        summary=f"Delivered guided step {step_index + 1} of {len(step_goals)} for {part_label}).",
        output=markdown,
        citations=[],
        status="partial",
    )
    return execution, markdown, next_state


def _execute_selected_tool(
    state: ChatWorkflowState,
) -> tuple[AgentToolExecution, str, list[AgentDocument], dict[str, Any] | None]:
    decision = state["decision"]
    profile = state["profile"]
    message = state["latest_message"]
    documents = [document.model_copy(deep=True) for document in state["documents"]]
    document_text, citations = _available_document_text(documents)

    if decision.selected_tool == "document_to_text":
        converted = 0
        waiting = 0
        failures: list[str] = []
        for index, document in enumerate(documents):
            if document.raw_text:
                preview = document.raw_text.strip()[:240]
                documents[index] = document.model_copy(
                    update={
                        "extraction_status": "ready",
                        "extracted_text_preview": preview,
                    }
                )
                converted += 1
            elif document.server_file_path and document.mime_type == "application/pdf":
                try:
                    markdown = convert_pdf_to_markdown(Path(document.server_file_path))
                    preview = markdown[:240]
                    documents[index] = document.model_copy(
                        update={
                            "extraction_status": "ready",
                            "extracted_text_preview": preview,
                            "raw_text": markdown,
                        }
                    )
                    converted += 1
                except PdfToMarkdownError as error:
                    failures.append(str(error))
                    waiting += 1
            else:
                waiting += 1
        summary = (
            f"Prepared {converted} text-based document(s) for downstream tools."
            if converted
            else "The workflow recognized that OCR/text extraction must run before grounded analysis can continue."
        )
        output = (
            "Text content is ready for the uploaded text files."
            if converted and waiting == 0
            else f"{converted} file(s) are ready. {waiting} PDF/image file(s) still need the OCR/parser tool."
        )
        if failures:
            output = f"{output}\n\nConversion notes:\n- " + "\n- ".join(failures)
        execution = AgentToolExecution(
            tool="document_to_text",
            summary=summary,
            output=output,
            citations=[document.name for document in documents if document.raw_text],
            status="completed" if waiting == 0 else "placeholder_pending",
        )
        assistant_message = f"{summary} {output}"
        return execution, assistant_message, documents, state.get("tutoring_state")

    if decision.selected_tool == "problem_solver":
        tutoring_state = state.get("tutoring_state")
        execution, assistant_message, next_tutoring_state = _run_guided_problem_solver(
            profile,
            message,
            documents,
            tutoring_state,
        )
        return execution, assistant_message, documents, next_tutoring_state

    if decision.selected_tool == "quiz_generator":
        execution = AgentToolExecution(
            tool="quiz_generator",
            summary="Quiz generation tool has been selected and staged.",
            output=(
                "Quiz generation is still a placeholder in this lab. The workflow would next extract key concepts "
                "from the document text and build targeted questions."
            ),
            citations=citations,
            status="placeholder_pending",
        )
        return execution, execution.output, documents, None

    execution = AgentToolExecution(
        tool="video_recommender",
        summary="Video recommendation tool has been selected and staged.",
        output=(
            "Video recommendation is still a placeholder in this lab. The workflow would next identify the target concept "
            "and retrieve short explainers plus note-taking prompts."
        ),
        citations=citations,
        status="placeholder_pending",
    )
    return execution, execution.output, documents, None


def _ingest_context_node(state: ChatWorkflowState) -> ChatWorkflowState:
    documents = state["documents"]
    return {
        "has_documents": len(documents) > 0,
        "pending_text": any(document.extraction_status == "pending" for document in documents),
        "llm_available": _langchain_client()[0] is not None,
    }


def _classify_intent_node(state: ChatWorkflowState) -> ChatWorkflowState:
    intent, hints = _infer_intent(state["latest_message"])
    if state["has_documents"] and state["pending_text"]:
        candidate_tool = "document_to_text"
        intent = "document_parsing"
        if "document_to_text" not in hints:
            hints = ["document_to_text", *hints]
    else:
        candidate_tool = hints[0] if hints else "problem_solver"
    return {
        "intent": intent,
        "requested_tool_hints": hints,
        "candidate_tool": candidate_tool,
    }


def _route_selector(state: ChatWorkflowState) -> Literal["llm_select", "deterministic_select"]:
    return "llm_select" if state.get("llm_available") else "deterministic_select"


def _llm_select_node(state: ChatWorkflowState) -> ChatWorkflowState:
    decision = _langgraph_model_decision(state)
    if decision is None:
        return {}
    return {"decision": decision}


def _post_llm_route(state: ChatWorkflowState) -> Literal["execute_tool", "deterministic_select"]:
    return "execute_tool" if state.get("decision") is not None else "deterministic_select"


def _deterministic_select_node(state: ChatWorkflowState) -> ChatWorkflowState:
    return {"decision": _deterministic_decision_from_state(state)}


def _execute_tool_node(state: ChatWorkflowState) -> ChatWorkflowState:
    execution, assistant_message, documents, tutoring_state = _execute_selected_tool(state)
    return {
        "execution": execution,
        "assistant_message": assistant_message,
        "documents": documents,
        "tutoring_progress": _tutoring_progress_from_state(tutoring_state),
        "tutoring_state": tutoring_state,
    }


def _finalize_node(state: ChatWorkflowState) -> ChatWorkflowState:
    return state


def _get_chat_workflow():
    global _chat_workflow
    if _chat_workflow is not None:
        return _chat_workflow

    graph = StateGraph(ChatWorkflowState)
    graph.add_node("ingest_context", _ingest_context_node)
    graph.add_node("classify_intent", _classify_intent_node)
    graph.add_node("llm_select", _llm_select_node)
    graph.add_node("deterministic_select", _deterministic_select_node)
    graph.add_node("execute_tool", _execute_tool_node)
    graph.add_node("finalize", _finalize_node)

    graph.add_edge(START, "ingest_context")
    graph.add_edge("ingest_context", "classify_intent")
    graph.add_conditional_edges("classify_intent", _route_selector)
    graph.add_conditional_edges("llm_select", _post_llm_route)
    graph.add_edge("deterministic_select", "execute_tool")
    graph.add_edge("execute_tool", "finalize")
    graph.add_edge("finalize", END)

    _chat_workflow = graph.compile(checkpointer=checkpoint_store.checkpointer)
    return _chat_workflow


def _run_chat_workflow(session_id: str, message: str, documents: list[AgentDocument], profile) -> ChatWorkflowState:
    workflow = _get_chat_workflow()
    return workflow.invoke(
        {
            "profile": profile,
            "documents": documents,
            "latest_message": message,
        },
        config={"configurable": {"thread_id": session_id}},
    )


def _persist_chat_outcome(record: dict[str, Any], request: AgentChatMessageRequest, final_state: ChatWorkflowState) -> AgentChatSessionState:
    decision = final_state["decision"]
    execution = final_state["execution"]
    assistant_text = final_state["assistant_message"]
    documents = final_state.get("documents", record["documents"])

    record["documents"] = documents
    record["messages"].append(
        AgentChatMessage(
            id=f"msg_{uuid4().hex[:12]}",
            role="assistant",
            content=assistant_text,
            createdAt=now_iso(),
            meta={
                "selectedTool": decision.selected_tool,
                "executionStatus": decision.execution_status,
                "source": decision.source,
                "toolStatus": execution.status,
            },
        )
    )
    record["latest_decision"] = decision
    record["latest_execution"] = execution
    record["tutoring_state"] = final_state.get("tutoring_state")
    record["tutoring_progress"] = final_state.get("tutoring_progress")
    record["updated_at"] = now_iso()
    memory_store.save_chat_session(record)
    return _session_state(record)


def send_chat_message(session_id: str, request: AgentChatMessageRequest) -> AgentChatSessionState:
    record = memory_store.get_chat_session(session_id)
    if not record:
        raise ValueError(f'Chat session "{session_id}" was not found')

    if request.student_id and not record.get("student_id"):
        record["student_id"] = request.student_id
        try:
            record["student_name"] = get_profile(request.student_id).student_name
        except ValueError:
            record["student_name"] = None

    profile = get_profile(record.get("student_id"))
    created_at = now_iso()
    record["messages"].append(
        AgentChatMessage(
            id=f"msg_{uuid4().hex[:12]}",
            role="user",
            content=request.message,
            createdAt=created_at,
            meta={"studentId": record.get("student_id")},
        )
    )
    record["updated_at"] = created_at
    memory_store.save_chat_session(record)

    final_state = _run_chat_workflow(session_id, request.message, record["documents"], profile)
    final_state["tutoring_state"] = final_state.get("tutoring_state", record.get("tutoring_state"))
    final_state["tutoring_progress"] = final_state.get("tutoring_progress", record.get("tutoring_progress"))
    return _persist_chat_outcome(record, request, final_state)


def stream_chat_message(session_id: str, request: AgentChatMessageRequest) -> Generator[str, None, None]:
    record = memory_store.get_chat_session(session_id)
    if not record:
        event = AgentStreamEvent(type="error", message=f'Chat session "{session_id}" was not found')
        yield event.model_dump_json(by_alias=True) + "\n"
        return

    if request.student_id and not record.get("student_id"):
        record["student_id"] = request.student_id
        try:
            record["student_name"] = get_profile(request.student_id).student_name
        except ValueError:
            record["student_name"] = None

    profile = get_profile(record.get("student_id"))
    created_at = now_iso()
    record["messages"].append(
        AgentChatMessage(
            id=f"msg_{uuid4().hex[:12]}",
            role="user",
            content=request.message,
            createdAt=created_at,
            meta={"studentId": record.get("student_id")},
        )
    )
    record["updated_at"] = created_at
    memory_store.save_chat_session(record)

    yield AgentStreamEvent(type="status", message="User message saved to the session.").model_dump_json(by_alias=True) + "\n"

    workflow = _get_chat_workflow()
    final_state: ChatWorkflowState = {
        "profile": profile,
        "documents": record["documents"],
        "latest_message": request.message,
        "tutoring_state": record.get("tutoring_state"),
        "tutoring_progress": record.get("tutoring_progress"),
    }

    for update in workflow.stream(
        final_state,
        stream_mode="updates",
        config={"configurable": {"thread_id": session_id}},
    ):
        for node_name, payload in update.items():
            if payload is None:
                yield AgentStreamEvent(
                    type="graph_update",
                    message=f"Completed node `{node_name}`.",
                    node=node_name,
                ).model_dump_json(by_alias=True) + "\n"
                continue

            if node_name == "llm_select" and payload.get("decision"):
                yield AgentStreamEvent(
                    type="tool_selected",
                    message=f"LangGraph selected `{payload['decision'].selected_tool}` with Gemini.",
                    node=node_name,
                    decision=payload["decision"],
                ).model_dump_json(by_alias=True) + "\n"
            elif node_name == "deterministic_select" and payload.get("decision"):
                yield AgentStreamEvent(
                    type="tool_selected",
                    message=f"LangGraph selected `{payload['decision'].selected_tool}` with deterministic routing.",
                    node=node_name,
                    decision=payload["decision"],
                ).model_dump_json(by_alias=True) + "\n"
            elif node_name == "execute_tool" and payload.get("execution"):
                yield AgentStreamEvent(
                    type="tool_result",
                    message=f"Executed `{payload['execution'].tool}`.",
                    node=node_name,
                    execution=payload["execution"],
                ).model_dump_json(by_alias=True) + "\n"
            else:
                yield AgentStreamEvent(
                    type="graph_update",
                    message=f"Completed node `{node_name}`.",
                    node=node_name,
                ).model_dump_json(by_alias=True) + "\n"
            final_state.update(payload)

    session_state = _persist_chat_outcome(record, request, final_state)
    yield AgentStreamEvent(
        type="session_state",
        message="Chat run completed.",
        session=session_state,
    ).model_dump_json(by_alias=True) + "\n"

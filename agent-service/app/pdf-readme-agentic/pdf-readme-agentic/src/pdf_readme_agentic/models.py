from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class SourceDocument:
    path: Path
    chapter_number: int | None
    part_number: int | None


@dataclass(slots=True)
class PreparedDocument:
    source: SourceDocument
    raw_markdown: str
    title: str | None
    body_lines: list[str]


@dataclass(slots=True)
class TraceStep:
    name: str
    detail: str


@dataclass(slots=True)
class RunResult:
    output_path: Path
    document_count: int
    trace_steps: list[TraceStep] = field(default_factory=list)

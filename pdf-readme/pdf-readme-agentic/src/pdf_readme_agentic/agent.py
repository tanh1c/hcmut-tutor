from __future__ import annotations

import json
import sys
from pathlib import Path

from .config import AgentConfig
from .markitdown_adapter import MarkItDownPdfAdapter
from .models import PreparedDocument, RunResult, SourceDocument, TraceStep
from .structure import (
    fallback_file_heading,
    parse_pdf_metadata,
    promote_headings,
    render_document_title,
    split_document_title,
)
from .text_cleanup import clean_pdf_lines, cleanup_markdown


class PdfToReadmeAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self._adapter = MarkItDownPdfAdapter(
            config.resolved_markitdown_root(),
            enable_plugins=config.enable_plugins,
        )
        self._trace_steps: list[TraceStep] = []

    def _trace(self, name: str, detail: str) -> None:
        self._trace_steps.append(TraceStep(name=name, detail=detail))
        if self.config.show_progress:
            print(f"[{name}] {detail}", file=sys.stderr, flush=True)

    def observe_sources(self) -> list[Path]:
        input_path = self.config.resolved_input_path()
        if not input_path.exists():
            raise FileNotFoundError(f"Input path does not exist: {input_path}")

        if input_path.is_file():
            if input_path.suffix.lower() != ".pdf":
                raise ValueError(f"Expected a PDF file, got: {input_path}")
            paths = [input_path]
        else:
            paths = sorted(path for path in input_path.glob(self.config.glob_pattern) if path.is_file())

        if not paths:
            raise FileNotFoundError(f"No PDF files matched: {input_path}")

        self._trace("observe", f"found {len(paths)} pdf file(s)")
        return paths

    def plan_sources(self, pdf_paths: list[Path]) -> list[SourceDocument]:
        planned: list[SourceDocument] = []
        for pdf_path in sorted(pdf_paths):
            chapter_number, part_number = parse_pdf_metadata(pdf_path)
            planned.append(
                SourceDocument(
                    path=pdf_path,
                    chapter_number=chapter_number,
                    part_number=part_number,
                )
            )
        self._trace("plan", "sorted sources and inferred chapter/part metadata from filenames")
        return planned

    def prepare_document(self, source: SourceDocument) -> PreparedDocument:
        raw_markdown = self._adapter.convert_pdf(source.path)
        cleaned_lines = clean_pdf_lines(raw_markdown)
        title_lines, body_lines = split_document_title(cleaned_lines)
        title = render_document_title(title_lines) or fallback_file_heading(source.path)
        body_lines = promote_headings(body_lines)
        self._trace("convert", f"converted {source.path.name}")
        return PreparedDocument(
            source=source,
            raw_markdown=raw_markdown,
            title=title,
            body_lines=body_lines,
        )

    def render_documents(self, documents: list[PreparedDocument]) -> str:
        if len(documents) == 1:
            document = documents[0]
            blocks = [f"# {document.title}"]
            body = "\n".join(document.body_lines).strip()
            if body:
                blocks.append(body)
            self._trace("render", "rendered single-document README")
            return cleanup_markdown("\n\n".join(blocks))

        blocks: list[str] = []
        current_chapter: int | None = None

        for document in documents:
            source = document.source

            if source.chapter_number is not None:
                if source.chapter_number != current_chapter:
                    current_chapter = source.chapter_number
                    blocks.append(f"# {document.title}")
                if source.part_number is not None:
                    blocks.append(
                        f"## {self.config.part_heading_template.format(part_number=source.part_number)}"
                    )
            else:
                current_chapter = None
                blocks.append(f"# {document.title}")

            body = "\n".join(document.body_lines).strip()
            if body:
                blocks.append(body)

        self._trace("render", "rendered multi-document README")
        return cleanup_markdown("\n\n".join(block for block in blocks if block.strip()))

    def review_output(self, markdown: str) -> str:
        reviewed = cleanup_markdown(markdown)
        self._trace("review", "normalized blank lines and finalized markdown")
        return reviewed

    def write_output(self, markdown: str) -> Path:
        output_path = self.config.resolved_output_path()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(markdown, encoding="utf-8")
        self._trace("write", f"wrote {output_path}")
        return output_path

    def write_trace(self) -> None:
        if not self.config.write_trace:
            return

        trace_path = self.config.resolved_trace_path()
        payload = [
            {
                "name": step.name,
                "detail": step.detail,
            }
            for step in self._trace_steps
        ]
        trace_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def run(self) -> RunResult:
        pdf_paths = self.observe_sources()
        sources = self.plan_sources(pdf_paths)
        documents = [self.prepare_document(source) for source in sources]
        markdown = self.render_documents(documents)
        reviewed = self.review_output(markdown)
        output_path = self.write_output(reviewed)
        self.write_trace()
        return RunResult(
            output_path=output_path,
            document_count=len(documents),
            trace_steps=list(self._trace_steps),
        )

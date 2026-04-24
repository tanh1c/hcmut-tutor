from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MARKITDOWN_ROOT = REPO_ROOT / "material" / "markitdown-main"
DEFAULT_ENV_FILE = REPO_ROOT / ".env"

# Local OCR settings.
# Fill these values if you want to keep OCR configuration in code.
# Leave a field empty to fall back to `.env` or environment variables.
CONFIGURED_OCR_MODEL = "gpt-4o"
CONFIGURED_OCR_BASE_URL = "https://api.openai.com/v1"
CONFIGURED_OCR_API_KEY = ""
CONFIGURED_OCR_PROMPT = ""


def _configured_value(value: str) -> str | None:
    cleaned = value.strip()
    return cleaned or None


def load_env_file(env_file: Path | None = None) -> Path | None:
    candidate = (env_file or DEFAULT_ENV_FILE).expanduser().resolve()
    if not candidate.is_file():
        return None

    load_dotenv(candidate, override=False)
    return candidate


@dataclass(slots=True)
class AgentConfig:
    input_path: Path
    output_path: Path | None = None
    markitdown_root: Path = field(default_factory=lambda: DEFAULT_MARKITDOWN_ROOT)
    glob_pattern: str = "*.pdf"
    enable_plugins: bool = False
    part_heading_template: str = "Phan {part_number}"
    write_trace: bool = False
    show_progress: bool = True
    ocr_enabled: bool = False
    ocr_model: str | None = None
    ocr_base_url: str | None = None
    ocr_api_key: str | None = None
    ocr_prompt: str | None = None

    def resolved_input_path(self) -> Path:
        return self.input_path.expanduser().resolve()

    def resolved_markitdown_root(self) -> Path:
        return self.markitdown_root.expanduser().resolve()

    def resolved_output_path(self) -> Path:
        if self.output_path is not None:
            return self.output_path.expanduser().resolve()

        input_path = self.resolved_input_path()
        if input_path.is_dir():
            return input_path / "README.md"
        return input_path.with_name("README.md")

    def resolved_trace_path(self) -> Path:
        output_path = self.resolved_output_path()
        return output_path.with_name(f"{output_path.stem}.trace.json")

    def resolved_ocr_model(self) -> str | None:
        return (
            self.ocr_model
            or _configured_value(CONFIGURED_OCR_MODEL)
            or os.getenv("OCR_MODEL")
            or os.getenv("OPENAI_MODEL")
        )

    def resolved_ocr_base_url(self) -> str:
        return (
            self.ocr_base_url
            or _configured_value(CONFIGURED_OCR_BASE_URL)
            or os.getenv("OCR_BASE_URL")
            or os.getenv("OPENAI_BASE_URL")
            or "https://api.openai.com/v1"
        )

    def resolved_ocr_api_key(self) -> str | None:
        return (
            self.ocr_api_key
            or _configured_value(CONFIGURED_OCR_API_KEY)
            or os.getenv("OCR_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        )

    def resolved_ocr_prompt(self) -> str | None:
        return self.ocr_prompt or _configured_value(CONFIGURED_OCR_PROMPT) or os.getenv("OCR_PROMPT")

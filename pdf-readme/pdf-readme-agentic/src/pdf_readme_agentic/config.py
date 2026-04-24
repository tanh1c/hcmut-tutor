from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MARKITDOWN_ROOT = REPO_ROOT / "material" / "markitdown-main"


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

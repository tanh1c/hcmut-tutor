from __future__ import annotations

import sys
from pathlib import Path


def _candidate_source_paths(markitdown_root: Path) -> list[Path]:
    return [
        markitdown_root / "packages" / "markitdown" / "src",
        markitdown_root,
    ]


def load_markitdown(markitdown_root: Path):
    for candidate in _candidate_source_paths(markitdown_root):
        if candidate.exists():
            source_path = str(candidate)
            if source_path not in sys.path:
                sys.path.insert(0, source_path)

    try:
        from markitdown import MarkItDown  # type: ignore[import-not-found]
    except Exception as exc:  # pragma: no cover - depends on local runtime
        raise RuntimeError(
            "Cannot import MarkItDown. Use a Python environment that already satisfies "
            "the dependencies for material/markitdown-main."
        ) from exc

    return MarkItDown


class MarkItDownPdfAdapter:
    def __init__(self, markitdown_root: Path, *, enable_plugins: bool = False):
        markitdown_cls = load_markitdown(markitdown_root)
        self._converter = markitdown_cls(enable_plugins=enable_plugins)

    def convert_pdf(self, pdf_path: Path) -> str:
        result = self._converter.convert(str(pdf_path))
        return result.markdown

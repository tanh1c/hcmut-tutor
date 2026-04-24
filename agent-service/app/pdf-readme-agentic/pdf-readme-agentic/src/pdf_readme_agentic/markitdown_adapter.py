from __future__ import annotations

import sys
from pathlib import Path

from .config import AgentConfig
from .ocr_client import OpenAICompatibleClient


OCR_CONVERTER_PRIORITY = -1.0

def _candidate_source_paths(markitdown_root: Path) -> list[Path]:
    return [
        markitdown_root / "packages" / "markitdown" / "src",
        markitdown_root / "packages" / "markitdown-ocr" / "src",
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
            "Cannot import MarkItDown. Install project dependencies with `pip install -e .` "
            "or pass `--markitdown-root` to a local markitdown-main checkout."
        ) from exc

    return MarkItDown


def load_markitdown_ocr(markitdown_root: Path):
    for candidate in _candidate_source_paths(markitdown_root):
        if candidate.exists():
            source_path = str(candidate)
            if source_path not in sys.path:
                sys.path.insert(0, source_path)

    try:
        from markitdown_ocr._ocr_service import LLMVisionOCRService  # type: ignore[import-not-found]
        from markitdown_ocr._pdf_converter_with_ocr import PdfConverterWithOCR  # type: ignore[import-not-found]
    except Exception as exc:  # pragma: no cover - depends on local runtime
        raise RuntimeError(
            "Cannot import markitdown-ocr. Install OCR support with `pip install -e '.[ocr]'` "
            "or make the OCR sources available through `--markitdown-root`."
        ) from exc

    return LLMVisionOCRService, PdfConverterWithOCR


def build_ocr_components(config: AgentConfig):
    model = config.resolved_ocr_model()
    if not model:
        raise ValueError(
            "OCR is enabled but no model is configured. Set --ocr-model or OCR_MODEL / OPENAI_MODEL."
        )

    base_url = config.resolved_ocr_base_url()
    api_key = config.resolved_ocr_api_key()
    if "api.openai.com" in base_url and not api_key:
        raise ValueError(
            "OCR is enabled for the OpenAI endpoint but no API key is configured. "
            "Set OCR_API_KEY / OPENAI_API_KEY or pass --ocr-api-key."
        )

    client = OpenAICompatibleClient(
        base_url=base_url,
        api_key=api_key,
    )
    return client, model


class MarkItDownPdfAdapter:
    def __init__(self, config: AgentConfig):
        markitdown_root = config.resolved_markitdown_root()
        markitdown_cls = load_markitdown(markitdown_root)
        kwargs = {
            "enable_plugins": config.enable_plugins,
        }
        self._converter = markitdown_cls(**kwargs)

        if config.ocr_enabled:
            llm_client, llm_model = build_ocr_components(config)
            llm_ocr_service_cls, pdf_converter_with_ocr_cls = load_markitdown_ocr(markitdown_root)
            ocr_service = llm_ocr_service_cls(
                client=llm_client,
                model=llm_model,
                default_prompt=config.resolved_ocr_prompt(),
            )
            self._converter.register_converter(
                pdf_converter_with_ocr_cls(ocr_service=ocr_service),
                priority=OCR_CONVERTER_PRIORITY,
            )

    def convert_pdf(self, pdf_path: Path) -> str:
        result = self._converter.convert(str(pdf_path))
        return result.markdown

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .agent import PdfToReadmeAgent
from .config import AgentConfig, DEFAULT_MARKITDOWN_ROOT, load_env_file


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert PDF files into a hierarchical README.md with an agentic pipeline."
    )
    parser.add_argument("input_path", type=Path, help="PDF file or directory that contains PDF files")
    parser.add_argument("--output", type=Path, default=None, help="Custom markdown output path")
    parser.add_argument(
        "--markitdown-root",
        type=Path,
        default=DEFAULT_MARKITDOWN_ROOT,
        help="Path to the local markitdown-main checkout",
    )
    parser.add_argument("--glob", default="*.pdf", help="Glob pattern when input_path is a directory")
    parser.add_argument("--enable-plugins", action="store_true", help="Enable MarkItDown plugins")
    parser.add_argument(
        "--part-heading-template",
        default="Phan {part_number}",
        help="Template for repeated chapter parts",
    )
    parser.add_argument("--write-trace", action="store_true", help="Write a JSON trace next to the output")
    parser.add_argument("--quiet", action="store_true", help="Hide progress logs during conversion")
    parser.add_argument("--ocr", action="store_true", help="Enable OCR for image-heavy or scanned PDFs")
    parser.add_argument("--ocr-model", default=None, help="Vision model for OCR")
    parser.add_argument("--ocr-base-url", default=None, help="OpenAI-compatible base URL for OCR")
    parser.add_argument("--ocr-api-key", default=None, help="API key for OCR endpoint")
    parser.add_argument("--ocr-prompt", default=None, help="Custom OCR prompt")
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        help="Path to a .env file for OCR config. Defaults to .env in the repo root if present.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    load_env_file(args.env_file)

    config = AgentConfig(
        input_path=args.input_path,
        output_path=args.output,
        markitdown_root=args.markitdown_root,
        glob_pattern=args.glob,
        enable_plugins=args.enable_plugins,
        part_heading_template=args.part_heading_template,
        write_trace=args.write_trace,
        show_progress=not args.quiet,
        ocr_enabled=args.ocr,
        ocr_model=args.ocr_model,
        ocr_base_url=args.ocr_base_url,
        ocr_api_key=args.ocr_api_key,
        ocr_prompt=args.ocr_prompt,
    )
    try:
        result = PdfToReadmeAgent(config).run()
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    print(f"Wrote {result.output_path} from {result.document_count} PDF file(s).")
    return 0

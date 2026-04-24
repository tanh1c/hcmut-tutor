from __future__ import annotations

import argparse
from pathlib import Path

from .agent import PdfToReadmeAgent
from .config import AgentConfig, DEFAULT_MARKITDOWN_ROOT


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
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    config = AgentConfig(
        input_path=args.input_path,
        output_path=args.output,
        markitdown_root=args.markitdown_root,
        glob_pattern=args.glob,
        enable_plugins=args.enable_plugins,
        part_heading_template=args.part_heading_template,
        write_trace=args.write_trace,
        show_progress=not args.quiet,
    )
    result = PdfToReadmeAgent(config).run()
    print(f"Wrote {result.output_path} from {result.document_count} PDF file(s).")
    return 0

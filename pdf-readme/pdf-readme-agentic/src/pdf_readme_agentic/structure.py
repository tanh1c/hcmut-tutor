from __future__ import annotations

import re
from pathlib import Path

from .text_cleanup import SECTION_PREFIX_RE, fold_text, looks_like_upper_title


PDF_CHAPTER_RE = re.compile(r"CHUONG\s+(\d+)")
PDF_PART_RE = re.compile(r"PHAN\s+(\d+)")


def parse_pdf_metadata(pdf_path: Path) -> tuple[int | None, int | None]:
    folded_name = fold_text(pdf_path.stem)
    chapter_match = PDF_CHAPTER_RE.search(folded_name)
    part_match = PDF_PART_RE.search(folded_name)

    chapter_number = int(chapter_match.group(1)) if chapter_match else None
    part_number = int(part_match.group(1)) if part_match else None
    return chapter_number, part_number


def looks_like_heading_candidate(line: str, *, has_body: bool) -> bool:
    if not line or line.startswith(("#", "|", "- ", "* ", "+ ")):
        return False
    if len(line) > 110:
        return False
    if line.endswith((".", ";", ",", "?", "!", "…")):
        return False
    if re.fullmatch(r"\d{4}", line):
        return False
    if SECTION_PREFIX_RE.match(line):
        return True
    if looks_like_upper_title(line):
        return True
    return has_body and len(line) <= 80


def split_document_title(lines: list[str]) -> tuple[list[str], list[str]]:
    if not lines:
        return [], []

    first_line_folded = fold_text(lines[0])
    if first_line_folded.startswith("CHUONG "):
        if not re.fullmatch(r"CHUONG\s+[IVXLC0-9]+", first_line_folded):
            return [lines[0]], lines[1:]

        title_lines = [lines[0]]
        index = 1
        consumed = 0

        while index < len(lines) and consumed < 2:
            line = lines[index]
            if not line or line.startswith(("#", "|")):
                break
            if line.startswith("(") or SECTION_PREFIX_RE.match(line):
                break
            if len(line) > 140:
                break
            title_lines.append(line)
            consumed += 1
            index += 1

        return title_lines, lines[index:]

    if looks_like_upper_title(lines[0]):
        title_lines = [lines[0]]
        index = 1
        while index < len(lines):
            line = lines[index]
            if not looks_like_upper_title(line) or len(line) > 140:
                break
            title_lines.append(line)
            index += 1
        return title_lines, lines[index:]

    return [], lines


def render_document_title(title_lines: list[str]) -> str | None:
    if not title_lines:
        return None
    if len(title_lines) == 1:
        return title_lines[0]
    return f"{title_lines[0]} {' '.join(title_lines[1:])}"


def fallback_file_heading(pdf_path: Path) -> str:
    name = pdf_path.stem.replace("_", " ")
    return re.sub(r"\s+", " ", name).strip()


def promote_headings(lines: list[str]) -> list[str]:
    promoted: list[str] = []

    for line in lines:
        if not line:
            if promoted and promoted[-1] != "":
                promoted.append("")
            continue

        if line.startswith("#") or line.startswith("|"):
            promoted.append(line)
            continue

        if re.fullmatch(r"CHUONG\s+[IVXLC0-9]+.*", fold_text(line)):
            promoted.append(f"# {line}")
            continue

        if re.match(r"^\d+\.\d+\b", line):
            promoted.append(f"### {line}")
            continue

        if re.match(r"^(?:\d+\.|[A-Z]\.)\s+", line):
            promoted.append(f"## {line}")
            continue

        if looks_like_upper_title(line):
            promoted.append(f"## {line}")
            continue

        if not promoted and looks_like_heading_candidate(line, has_body=True):
            promoted.append(f"## {line}")
            continue

        promoted.append(line)

    merged: list[str] = []
    for line in promoted:
        if (
            merged
            and re.match(r"^#+\s+", merged[-1])
            and (looks_like_upper_title(line) or (line.isupper() and len(line) <= 10))
            and len(line) <= 30
        ):
            merged[-1] = f"{merged[-1]} {line}".strip()
            continue

        merged.append(line)

    while merged and merged[-1] == "":
        merged.pop()
    return merged

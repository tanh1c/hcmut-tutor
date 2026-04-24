from __future__ import annotations

import re
import unicodedata
from pathlib import Path

try:
    from markitdown import MarkItDown
except ImportError:  # pragma: no cover
    MarkItDown = None


MARKDOWN_HEADING_RE = re.compile(r"^(#{1,6})\s*(.*?)\s*$")
MARKER_ONLY_RE = re.compile(r"^(?:[IVXLC]+|\d{1,2}|[A-Za-z])$")
SECTION_PREFIX_RE = re.compile(r"^(?:[IVXLC]+\.\s+|\d+(?:\.\d+)*\.?\s+|[A-Za-z]\.\s+)")
COMMON_NOISE_FRAGMENT_RE = re.compile(
    r"(Äáº I\s*Há»ŒC\s*QUá»C\s*GIA(?:\s*(?:TP\.?|THÃ€NH\s*PHá»))?\s*Há»’\s*CHÃ(?:\s*MINH)?)"
    r"|"
    r"(TRÆ¯á»œNG\s*Äáº I\s*Há»ŒC\s*BÃCH\s*KHOA)"
    r"|"
    r"(Bá»™\s*mÃ´n\s*LÃ½\s*luáº­n\s*ChÃ­nh\s*trá»‹\s*-\s*TrÆ°á»ng\s*Äáº¡i\s*há»c\s*BÃ¡ch\s*khoa\s*[â€“-]?\s*ÄHQG\s*TP\.?\s*HCM)",
    re.IGNORECASE,
)
EMPTY_TABLE_ROW_RE = re.compile(r"^\|\s*(?:\|\s*)+$")


def fold_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    without_marks = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return without_marks.upper()


def normalize_line(line: str) -> str:
    line = line.replace("\xa0", " ").strip()
    if not line:
        return ""

    heading_match = MARKDOWN_HEADING_RE.fullmatch(line)
    if heading_match:
        hashes, text = heading_match.groups()
        text = re.sub(r"\s+", " ", text).strip()
        return hashes if not text else f"{hashes} {text}"

    if line.startswith("|"):
        return re.sub(r"[ \t]+", " ", line).strip()

    return re.sub(r"\s+", " ", line).strip()


def cleanup_markdown(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    cleaned = "\n".join(lines).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned + "\n"


def looks_like_upper_title(line: str) -> bool:
    if not line or line.startswith("|"):
        return False
    letters = [char for char in line if char.isalpha()]
    if len(letters) < 3:
        return False
    uppercase_ratio = sum(char.isupper() for char in letters) / len(letters)
    return uppercase_ratio >= 0.7 and len(line) <= 120


def dedupe_neighbors(lines: list[str]) -> list[str]:
    deduped: list[str] = []
    previous: str | None = None
    for line in lines:
        if line == previous:
            continue
        deduped.append(line)
        previous = line
    return deduped


def merge_heading_fragments(lines: list[str]) -> list[str]:
    merged: list[str] = []
    for line in lines:
        if merged and looks_like_upper_title(merged[-1]) and looks_like_upper_title(line) and len(line) <= 30:
            merged[-1] = f"{merged[-1]} {line}".strip()
            continue
        merged.append(line)
    return merged


def merge_wrapped_lines(lines: list[str]) -> list[str]:
    merged: list[str] = []
    for line in lines:
        if (
            merged
            and not merged[-1].startswith(("#", "|", "- ", "* ", "+ "))
            and not line.startswith(("#", "|", "- ", "* ", "+ "))
            and not SECTION_PREFIX_RE.match(merged[-1])
            and not SECTION_PREFIX_RE.match(line)
            and not merged[-1].endswith((".", ";", ":", "?", "!", "â€¦"))
            and len(merged[-1]) <= 100
            and line
            and line[0].islower()
        ):
            merged[-1] = f"{merged[-1]} {line}".strip()
            continue
        merged.append(line)
    return merged


def merge_marker_lines(lines: list[str]) -> list[str]:
    merged: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if index + 1 < len(lines) and MARKER_ONLY_RE.fullmatch(line):
            next_line = lines[index + 1]
            if next_line and not next_line.startswith(("#", "|", "- ", "* ", "+ ")):
                marker = f"{line}." if line[-1].isalnum() else line
                merged.append(f"{marker} {next_line}".strip())
                index += 2
                continue
        merged.append(line)
        index += 1
    return merged


def _flush_text_buffer(buffer: list[str], output: list[str]) -> None:
    if not buffer:
        return
    block = merge_marker_lines(buffer)
    block = merge_heading_fragments(block)
    block = merge_wrapped_lines(block)
    block = dedupe_neighbors(block)
    output.extend(block)
    buffer.clear()


def normalize_text_blocks(lines: list[str]) -> list[str]:
    output: list[str] = []
    buffer: list[str] = []
    for line in lines:
        if line:
            buffer.append(line)
            continue
        _flush_text_buffer(buffer, output)
        if output and output[-1] != "":
            output.append("")
    _flush_text_buffer(buffer, output)
    while output and output[-1] == "":
        output.pop()
    return output


def pdf_plain_text(line: str) -> str:
    text = re.sub(r"[|#>*_`~]+", " ", line)
    text = text.replace("-", " ")
    return re.sub(r"\s+", " ", text).strip()


def is_common_noise_line(line: str) -> bool:
    plain = fold_text(pdf_plain_text(line))
    compact = re.sub(r"[^A-Z0-9]+", "", plain)
    if not plain:
        return False
    if plain.startswith("DAI HOC QUOC GIA"):
        return True
    if plain.startswith("TRUONG DAI HOC BACH KHOA"):
        return True
    if plain.startswith("BO MON LY LUAN CHINH TRI"):
        return True
    if plain == "MINH":
        return True
    if "DAI HOC QUOC GIA" in plain and "HO CHI" in plain:
        return True
    if "DHQGTPHCM" in compact:
        return True
    return False


def _previous_nonempty(lines: list[str], index: int) -> str | None:
    for cursor in range(index - 1, -1, -1):
        if lines[cursor]:
            return lines[cursor]
    return None


def _next_nonempty(lines: list[str], index: int) -> str | None:
    for cursor in range(index + 1, len(lines)):
        if lines[cursor]:
            return lines[cursor]
    return None


def contextual_page_numbers(lines: list[str]) -> list[str]:
    filtered: list[str] = []
    for index, line in enumerate(lines):
        if not re.fullmatch(r"\d{1,3}", line):
            filtered.append(line)
            continue
        prev_line = _previous_nonempty(lines, index)
        next_line = _next_nonempty(lines, index)
        if prev_line and prev_line.startswith("|"):
            continue
        if next_line and next_line.startswith("|"):
            continue
        if prev_line and next_line and looks_like_upper_title(prev_line) and looks_like_upper_title(next_line):
            continue
        filtered.append(line)
    return filtered


def clean_pdf_lines(markdown: str) -> list[str]:
    lines: list[str] = []
    for raw_line in markdown.splitlines():
        raw_line = COMMON_NOISE_FRAGMENT_RE.sub(" ", raw_line)
        line = normalize_line(raw_line)
        if not line:
            lines.append("")
            continue
        if line == "-" or EMPTY_TABLE_ROW_RE.fullmatch(line):
            continue
        if is_common_noise_line(line):
            continue
        lines.append(line)
    return normalize_text_blocks(contextual_page_numbers(lines))


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
        promoted.append(line)
    return promoted


class PdfToMarkdownError(RuntimeError):
    pass


def convert_pdf_to_markdown(pdf_path: Path) -> str:
    if MarkItDown is None:
        raise PdfToMarkdownError(
            "MarkItDown is not installed. Install agent-service requirements to enable PDF conversion."
        )
    converter = MarkItDown(enable_plugins=False)
    try:
        result = converter.convert(str(pdf_path))
    except Exception as exc:  # pragma: no cover
        raise PdfToMarkdownError(f"Failed to convert PDF {pdf_path.name}: {exc}") from exc
    raw_markdown = result.markdown or ""
    cleaned_lines = clean_pdf_lines(raw_markdown)
    promoted_lines = promote_headings(cleaned_lines)
    return cleanup_markdown("\n".join(promoted_lines)).strip()

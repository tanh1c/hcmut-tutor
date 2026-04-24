from __future__ import annotations

import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pdf_readme_agentic.structure import (
    parse_pdf_metadata,
    promote_headings,
    render_document_title,
    split_document_title,
)


class StructureTests(unittest.TestCase):
    def test_parse_pdf_metadata_detects_chapter_and_part(self) -> None:
        path = Path("03_SP1007_Chuong 3_Phap luat dan su_Phan 2.pdf")
        self.assertEqual(parse_pdf_metadata(path), (3, 2))

    def test_split_document_title_handles_chapter_header(self) -> None:
        lines = [
            "CHUONG III",
            "PHAP LUAT DAN SU",
            "VA TO TUNG DAN SU",
            "1. NOI DUNG",
        ]
        title_lines, body_lines = split_document_title(lines)
        self.assertEqual(render_document_title(title_lines), "CHUONG III PHAP LUAT DAN SU VA TO TUNG DAN SU")
        self.assertEqual(body_lines, ["1. NOI DUNG"])

    def test_promote_headings_merges_heading_continuation(self) -> None:
        lines = [
            "THUC HIEN PHAP LUAT, VI PHAM PHAP LUAT VA TRACH NHIEM PHAP",
            "LY",
            "",
            "Noi dung chi tiet",
        ]
        promoted = promote_headings(lines)
        self.assertEqual(promoted[0], "## THUC HIEN PHAP LUAT, VI PHAM PHAP LUAT VA TRACH NHIEM PHAP LY")


if __name__ == "__main__":
    unittest.main()

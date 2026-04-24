from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from pdf_readme_agentic.config import AgentConfig


class AgentConfigTests(unittest.TestCase):
    def test_directory_output_defaults_to_readme(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            input_dir = Path(tmp_dir) / "my-pdfs"
            input_dir.mkdir()
            config = AgentConfig(input_path=input_dir)
            self.assertEqual(config.resolved_output_path(), input_dir.resolve() / "README.md")

    def test_file_output_defaults_to_sibling_readme(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            input_file = Path(tmp_dir) / "a.pdf"
            input_file.write_text("", encoding="utf-8")
            config = AgentConfig(input_path=input_file)
            self.assertEqual(config.resolved_output_path(), input_file.resolve().with_name("README.md"))


if __name__ == "__main__":
    unittest.main()

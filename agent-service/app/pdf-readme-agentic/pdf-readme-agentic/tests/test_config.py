from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

import pdf_readme_agentic.config as config_module
from pdf_readme_agentic.config import AgentConfig


class AgentConfigTests(unittest.TestCase):
    def setUp(self) -> None:
        self._original_values = (
            config_module.CONFIGURED_OCR_MODEL,
            config_module.CONFIGURED_OCR_BASE_URL,
            config_module.CONFIGURED_OCR_API_KEY,
            config_module.CONFIGURED_OCR_PROMPT,
        )
        for key in ("OCR_MODEL", "OPENAI_MODEL", "OCR_BASE_URL", "OPENAI_BASE_URL", "OCR_API_KEY", "OPENAI_API_KEY", "OCR_PROMPT"):
            os.environ.pop(key, None)

    def tearDown(self) -> None:
        (
            config_module.CONFIGURED_OCR_MODEL,
            config_module.CONFIGURED_OCR_BASE_URL,
            config_module.CONFIGURED_OCR_API_KEY,
            config_module.CONFIGURED_OCR_PROMPT,
        ) = self._original_values
        for key in ("OCR_MODEL", "OPENAI_MODEL", "OCR_BASE_URL", "OPENAI_BASE_URL", "OCR_API_KEY", "OPENAI_API_KEY", "OCR_PROMPT"):
            os.environ.pop(key, None)

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

    def test_ocr_defaults_use_openai_endpoint(self) -> None:
        config = AgentConfig(input_path=Path("."))
        self.assertEqual(config.resolved_ocr_base_url(), "https://api.openai.com/v1")

    def test_ocr_uses_config_file_values_before_environment(self) -> None:
        config_module.CONFIGURED_OCR_MODEL = "gpt-4o"
        config_module.CONFIGURED_OCR_BASE_URL = "https://api.openai.com/v1"
        config_module.CONFIGURED_OCR_API_KEY = "configured-key"
        config_module.CONFIGURED_OCR_PROMPT = "configured prompt"
        os.environ["OCR_MODEL"] = "env-model"
        os.environ["OCR_API_KEY"] = "env-key"
        os.environ["OCR_PROMPT"] = "env prompt"

        config = AgentConfig(input_path=Path("."))
        self.assertEqual(config.resolved_ocr_model(), "gpt-4o")
        self.assertEqual(config.resolved_ocr_api_key(), "configured-key")
        self.assertEqual(config.resolved_ocr_prompt(), "configured prompt")


if __name__ == "__main__":
    unittest.main()

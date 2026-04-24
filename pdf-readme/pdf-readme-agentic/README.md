# PDF Readme Agentic

Agentic pipeline to convert one PDF file or a directory of PDF files into a hierarchical `README.md`.

This project is built on top of the local `material/markitdown-main` source tree. It does not modify the MarkItDown codebase. Instead, it wraps MarkItDown with an agent-style workflow:

1. Observe input files
2. Plan document order and chapter grouping
3. Convert PDF to Markdown with MarkItDown
4. Repair noisy lines and infer headings
5. Render a final `README.md`
6. Optionally write a JSON trace for debugging

## Folder layout

```text
pdf-readme-agentic/
  pyproject.toml
  README.md
  src/pdf_readme_agentic/
  tests/
```

## Usage

Run from the workspace root:

```bash
PYTHONPATH=pdf-readme-agentic/src /tmp/cc_markitdown_env/bin/python -m pdf_readme_agentic material/PLDC
```

Write to a custom output path:

```bash
PYTHONPATH=pdf-readme-agentic/src /tmp/cc_markitdown_env/bin/python -m pdf_readme_agentic material/PLDC --output /tmp/PLDC_README.md
```

Process a single PDF:

```bash
PYTHONPATH=pdf-readme-agentic/src /tmp/cc_markitdown_env/bin/python -m pdf_readme_agentic "material/PLDC/02_SP1007_Chuong 2_Nhung khai niem chung ve phap luat (gui sinh vien).pdf"
```

Write a trace file:

```bash
PYTHONPATH=pdf-readme-agentic/src /tmp/cc_markitdown_env/bin/python -m pdf_readme_agentic material/PLDC --write-trace
```

## Notes

- Default output is `README.md` next to the input:
  - input file -> sibling `README.md`
  - input directory -> `<directory>/README.md`
- Default MarkItDown root is `material/markitdown-main`
- If your environment cannot import MarkItDown dependencies, run the agent in the same Python environment that already works with `material/markitdown-main`

## Development

Run tests:

```bash
PYTHONPATH=pdf-readme-agentic/src python3 -m unittest discover -s pdf-readme-agentic/tests -p "test_*.py"
```

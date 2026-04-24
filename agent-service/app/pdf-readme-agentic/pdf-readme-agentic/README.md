# PDF Readme Agentic

Convert one PDF file, or a directory of PDF files, into a cleaned and structured Markdown `README.md`.

This project is focused on normal PDF text extraction with MarkItDown. It reads the text layer that already exists in the PDF, then applies a lightweight pipeline to:

1. observe PDF inputs
2. infer ordering from file names
3. convert each PDF to Markdown
4. clean noisy text and promote headings
5. render a final `README.md`
6. optionally write a JSON trace for debugging

## Features

- Process a single PDF or a folder of PDFs
- Generate one merged Markdown README
- Infer chapter and part grouping from file names
- Clean common PDF extraction noise
- Optional trace file for debugging conversion steps

## Project Layout

```text
pdf-readme-agentic/
  README.md
  pyproject.toml
  src/pdf_readme_agentic/
  tests/
  PLDC/
```

## Requirements

- Python 3.11 or newer
- PDF dependencies are installed automatically by this project
- PDFs should contain a usable text layer

Note: if a PDF is a scanned image without selectable text, extraction quality will depend on what MarkItDown can read from the file as-is.

## Quick Start

Create a virtual environment:

```bash
python3 -m venv .venv
```

Install the project:

```bash
.venv/bin/pip install -e .
```

Or use the bootstrap script:

```bash
sh scripts/setup.sh
```

## Run The CLI

Use the installed console script:

```bash
.venv/bin/pdf-readme-agentic --help
```

Or run the module directly:

```bash
.venv/bin/python -m pdf_readme_agentic --help
```

## Usage

### Convert one PDF

```bash
.venv/bin/pdf-readme-agentic CHAPTER2.pdf --output CHAPTER2_README.md
```

Another example:

```bash
.venv/bin/pdf-readme-agentic Lab4_Math_Exercise.pdf --output Lab4_Math_Exercise_README.md
```

### Convert every PDF in a directory into one README

Process all PDFs in the current folder:

```bash
.venv/bin/pdf-readme-agentic . --glob '*.pdf' --output OUTPUT_README.md
```

Process all PDFs inside `PLDC` and write one merged README:

```bash
.venv/bin/pdf-readme-agentic PLDC --glob '*.pdf' --output PLDC/README.md
```

Include PDFs in nested subfolders:

```bash
.venv/bin/pdf-readme-agentic PLDC --glob '**/*.pdf' --output PLDC/README.md
```

### Write a trace file

```bash
.venv/bin/pdf-readme-agentic CHAPTER2.pdf \
  --output CHAPTER2_README.md \
  --write-trace
```

### Hide progress logs

```bash
.venv/bin/pdf-readme-agentic CHAPTER2.pdf \
  --output CHAPTER2_README.md \
  --quiet
```

## Using A Local MarkItDown Checkout

If you already have a local `markitdown-main` checkout, pass it explicitly:

```bash
.venv/bin/pdf-readme-agentic CHAPTER2.pdf \
  --markitdown-root /path/to/markitdown-main \
  --output CHAPTER2_README.md
```

This repo works with either:

- project dependencies installed by `pip install -e .`
- or a local `markitdown-main` source tree passed through `--markitdown-root`

## Output Behavior

- Directory input writes to `<directory>/README.md` by default
- File input writes to a sibling `README.md` by default
- If you run the tool on a PDF in the repo root without `--output`, it can overwrite this repo's own `README.md`

For that reason, use `--output` whenever you process a single PDF from the project root.

## Useful CLI Options

- `--output`: custom output Markdown path
- `--glob`: file pattern when the input is a directory
- `--write-trace`: write `<output>.trace.json`
- `--quiet`: suppress progress logs
- `--enable-plugins`: enable MarkItDown plugins
- `--part-heading-template`: customize repeated part headings

## Development

Run the test suite:

```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

## Verified Commands

The following commands were validated in this repo:

```bash
.venv/bin/pdf-readme-agentic CHAPTER2.pdf --output CHAPTER2_README.md
.venv/bin/pdf-readme-agentic PLDC --glob '*.pdf' --output PLDC/README.md
```

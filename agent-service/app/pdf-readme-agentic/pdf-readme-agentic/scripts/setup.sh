#!/usr/bin/env sh
set -eu

VENV_DIR="${VENV_DIR:-.venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
INSTALL_TARGET="."

if [ "${1:-}" = "--ocr" ]; then
  INSTALL_TARGET=".[ocr]"
fi

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -e "$INSTALL_TARGET"

printf 'Environment ready: %s\n' "$VENV_DIR"

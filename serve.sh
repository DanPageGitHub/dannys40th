#!/usr/bin/env bash
# Run from anywhere in WSL. This script's folder is always used as the server root.
# Example: bash "/mnt/c/Projects/Dannys40th/Danny40thCursorEdition/Dannys40th/serve.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo ""
echo "  Serving from: $SCRIPT_DIR"
echo "  Open in Chrome:"
echo "    http://localhost:8080"
echo "    http://localhost:8080/visualiser2.html"
echo "  Stop with Ctrl+C"
echo ""

if command -v node &>/dev/null; then
  exec node serve.js
else
  exec python3 serve.py
fi

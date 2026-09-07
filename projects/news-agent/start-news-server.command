#!/bin/bash
# Double-click this file to start the IFM News Agency scanner.
# Leave the Terminal window open while you scan; close it when you're done.

cd "$(dirname "$0")" || exit 1

if [ ! -x "./venv/bin/python" ]; then
  echo "❌ Could not find ./venv/bin/python in $(pwd)"
  echo "   Set it up first:  python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

if lsof -nP -iTCP:8765 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✅ The scanner is already running on port 8765."
  echo "   Go back to the IFM site and tap 'Scan for news'."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 0
fi

echo "📡 Starting IFM News Agency scanner on http://localhost:8765 ..."
echo "   Keep this window open, then tap 'Scan for news' on the IFM site."
echo ""

./venv/bin/python server.py

echo ""
echo "🛑 Scanner stopped."
read -n 1 -s -r -p "Press any key to close..."

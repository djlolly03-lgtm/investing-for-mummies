#!/bin/bash
# Daily runner for IFM news scanner
# Called by cron — activate venv and run scan

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
source "$SCRIPT_DIR/venv/bin/activate"

# Run scanner
python scan.py >> "$SCRIPT_DIR/scan.log" 2>&1

#!/bin/bash
# Stitch the zz-tile-* crops from a p1-launch capture into one labelled contact sheet.
# usage: tile-p1.sh <shots-dir> [cols]
set -e
DIR="$1"; COLS="${2:-5}"
N=$(ls "$DIR"/zz-tile-*.png | wc -l | tr -d ' ')
ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -y -loglevel error -pattern_type glob -i "$DIR/zz-tile-*.png" \
  -filter_complex "scale=560:-2,tile=${COLS}x${ROWS}:padding=6:color=0x101010" \
  -frames:v 1 "$DIR/zz-SLING-FILMSTRIP.png"
echo "$DIR/zz-SLING-FILMSTRIP.png"

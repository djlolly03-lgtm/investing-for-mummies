#!/usr/bin/env bash
# Precompile the .jsx sources to plain-JS .js so the browser never has to load
# @babel/standalone (~2.8 MB) or compile JSX at runtime. This is THE fix for
# slow mobile loading. Each file is wrapped in an IIFE (--format=iife) so the
# top-level `const { useState } = React` declarations don't collide across
# files in the shared global scope. Cross-file symbols are exposed via the
# existing `window.X = ...` / Object.assign(window, …) assignments.
#
# Run from swayamvar/ after editing ANY .jsx file, then deploy.
set -e
cd "$(dirname "$0")"
for f in ui-common host-view player-view app; do
  npx --yes esbuild@0.21.5 "$f.jsx" \
    --bundle --format=iife --jsx=transform \
    --outfile="$f.js"
  echo "  built $f.js"
done
echo "JSX precompiled. Remember to bump the cache stamp in index.html before deploy."

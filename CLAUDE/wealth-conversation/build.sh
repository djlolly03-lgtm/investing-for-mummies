#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
npm install
npx esbuild app.jsx --bundle --outfile=app.js --format=iife --minify
echo "Built app.js. Bump cache stamp in index.html before deploy."

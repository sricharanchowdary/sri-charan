#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git not found. Install git and re-run this script." >&2
  exit 1
fi

git init 2>/dev/null || true
git add .
MSG=${1:-"Finalize portfolio: tests, testing doc, submission email, update links"}
if git commit -m "$MSG" >/dev/null 2>&1; then
  echo "Committed changes"
else
  echo "No changes to commit"
fi

git branch -M main 2>/dev/null || true
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin https://github.com/sricharan/my-portfolio.git
fi

git push -u origin main

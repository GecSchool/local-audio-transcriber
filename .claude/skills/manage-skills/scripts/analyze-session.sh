#!/usr/bin/env bash
# analyze-session.sh - Collect session changes and output as JSON

set -euo pipefail

SUMMARY_MODE=false
if [[ "${1:-}" == "--summary" ]]; then
  SUMMARY_MODE=true
fi

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="."
cd "$REPO_ROOT"

# Determine base branch
BASE_BRANCH="main"
if ! git rev-parse --verify main >/dev/null 2>&1; then
  if git rev-parse --verify master >/dev/null 2>&1; then
    BASE_BRANCH="master"
  fi
fi

# Collect changed files (deduplicated)
CHANGED_FILES=$(
  {
    git diff HEAD --name-only 2>/dev/null || true
    git diff "$BASE_BRANCH"...HEAD --name-only 2>/dev/null || true
  } | sort -u
)

if [[ -z "$CHANGED_FILES" ]]; then
  if [[ "$SUMMARY_MODE" == true ]]; then
    echo "No changes detected"
    exit 0
  fi
  echo '{"changed_files":[],"grouped_by_dir":{},"commit_count":0,"base_branch":"'"$BASE_BRANCH"'"}'
  exit 0
fi

# Count commits
COMMIT_COUNT=$(git log --oneline "$BASE_BRANCH"..HEAD 2>/dev/null | wc -l | tr -d ' ')

if [[ "$SUMMARY_MODE" == true ]]; then
  FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
  echo "$FILE_COUNT files changed across $COMMIT_COUNT commits since $BASE_BRANCH"
  exit 0
fi

# Group by top-level directory
declare -A GROUPED
while IFS= read -r file; do
  if [[ -z "$file" ]]; then continue; fi

  # Extract top directory (or "root")
  if [[ "$file" == */* ]]; then
    DIR="${file%%/*}"
  else
    DIR="(root)"
  fi

  BASENAME=$(basename "$file")
  if [[ -z "${GROUPED[$DIR]:-}" ]]; then
    GROUPED[$DIR]="$BASENAME"
  else
    GROUPED[$DIR]="${GROUPED[$DIR]}|$BASENAME"
  fi
done <<< "$CHANGED_FILES"

# Output JSON
echo "{"
echo "  \"changed_files\": ["
FIRST=true
while IFS= read -r file; do
  if [[ -z "$file" ]]; then continue; fi
  if [[ "$FIRST" == true ]]; then
    FIRST=false
  else
    echo ","
  fi
  echo -n "    \"$file\""
done <<< "$CHANGED_FILES"
echo ""
echo "  ],"

echo "  \"grouped_by_dir\": {"
FIRST=true
for dir in "${!GROUPED[@]}"; do
  if [[ "$FIRST" == true ]]; then
    FIRST=false
  else
    echo ","
  fi
  FILES="${GROUPED[$dir]}"
  FILES_JSON=$(echo "$FILES" | tr '|' '\n' | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
  echo -n "    \"$dir\": [$FILES_JSON]"
done
echo ""
echo "  },"

echo "  \"commit_count\": $COMMIT_COUNT,"
echo "  \"base_branch\": \"$BASE_BRANCH\""
echo "}"

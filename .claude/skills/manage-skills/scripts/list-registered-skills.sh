#!/usr/bin/env bash
# list-registered-skills.sh - List all registered verify-* skills as JSON

set -euo pipefail

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="."
cd "$REPO_ROOT"

# Find all verify-* skills
SKILL_DIRS=$(find .claude/skills/verify-* -type d -maxdepth 0 2>/dev/null || true)

if [[ -z "$SKILL_DIRS" ]]; then
  echo '{"skills":[],"count":0}'
  exit 0
fi

# Output JSON
echo "{"
echo "  \"skills\": ["

FIRST=true
while IFS= read -r skill_dir; do
  if [[ -z "$skill_dir" ]]; then continue; fi

  SKILL_MD="$skill_dir/SKILL.md"
  if [[ ! -f "$SKILL_MD" ]]; then continue; fi

  # Extract skill name from directory
  SKILL_NAME=$(basename "$skill_dir")

  # Extract description from frontmatter
  DESCRIPTION=$(awk '/^---$/,/^---$/{print}' "$SKILL_MD" | grep '^description:' | sed 's/^description: *//' || echo "No description")

  if [[ "$FIRST" == true ]]; then
    FIRST=false
  else
    echo ","
  fi

  echo -n "    {\"name\":\"$SKILL_NAME\",\"description\":\"$DESCRIPTION\",\"path\":\"$SKILL_MD\"}"
done <<< "$SKILL_DIRS"

echo ""
echo "  ],"

SKILL_COUNT=$(echo "$SKILL_DIRS" | wc -l | tr -d ' ')
echo "  \"count\": $SKILL_COUNT"
echo "}"

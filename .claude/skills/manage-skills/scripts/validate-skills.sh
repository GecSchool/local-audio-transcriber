#!/usr/bin/env bash
# validate-skills.sh - Validate SKILL.md files
# Usage: validate-skills.sh [--modified SKILL_NAME...]
#        validate-skills.sh --all

set -euo pipefail

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="."
cd "$REPO_ROOT"

SKILLS_TO_CHECK=()

if [[ "$#" -eq 0 ]] || [[ "$1" == "--all" ]]; then
  # Check all verify-* skills
  while IFS= read -r skill_dir; do
    SKILLS_TO_CHECK+=("$(basename "$skill_dir")")
  done < <(find .claude/skills/verify-* -type d -maxdepth 0 2>/dev/null || true)
elif [[ "$1" == "--modified" ]]; then
  shift
  SKILLS_TO_CHECK=("$@")
fi

if [[ ${#SKILLS_TO_CHECK[@]} -eq 0 ]]; then
  echo "No skills to validate"
  exit 0
fi

echo "Validating ${#SKILLS_TO_CHECK[@]} skill(s)..."
echo ""

FAILED=0

for skill in "${SKILLS_TO_CHECK[@]}"; do
  SKILL_MD=".claude/skills/$skill/SKILL.md"

  echo "→ Checking $skill..."

  if [[ ! -f "$SKILL_MD" ]]; then
    echo "  ✗ SKILL.md not found"
    ((FAILED++))
    continue
  fi

  # Check 1: Has frontmatter
  if ! grep -q '^---$' "$SKILL_MD"; then
    echo "  ✗ Missing frontmatter"
    ((FAILED++))
    continue
  fi

  # Check 2: Has name in frontmatter
  if ! awk '/^---$/,/^---$/{print}' "$SKILL_MD" | grep -q '^name:'; then
    echo "  ✗ Missing 'name' in frontmatter"
    ((FAILED++))
    continue
  fi

  # Check 3: Has description
  if ! awk '/^---$/,/^---$/{print}' "$SKILL_MD" | grep -q '^description:'; then
    echo "  ✗ Missing 'description' in frontmatter"
    ((FAILED++))
    continue
  fi

  # Check 4: Check if Related Files section exists
  if grep -q '## Related Files' "$SKILL_MD"; then
    # Extract file paths and check if they exist
    FILES=$(awk '/## Related Files/,/^##/{print}' "$SKILL_MD" | grep -oE '\`[^`]+\`' | tr -d '`' | grep -v '^##' || true)
    if [[ -n "$FILES" ]]; then
      MISSING_FILES=()
      while IFS= read -r file; do
        # Skip table headers and empty lines
        if [[ "$file" == "File" ]] || [[ "$file" == "Purpose" ]] || [[ -z "$file" ]]; then
          continue
        fi
        # Check if file exists (handle glob patterns)
        if [[ "$file" == *"*"* ]]; then
          # Skip glob patterns
          continue
        fi
        if [[ ! -f "$file" ]] && [[ ! -d "$file" ]]; then
          MISSING_FILES+=("$file")
        fi
      done <<< "$FILES"

      if [[ ${#MISSING_FILES[@]} -gt 0 ]]; then
        echo "  ⚠  Missing referenced files:"
        for f in "${MISSING_FILES[@]}"; do
          echo "      - $f"
        done
      fi
    fi
  fi

  echo "  ✓ Validation passed"
done

echo ""

if [[ $FAILED -gt 0 ]]; then
  echo "✗ $FAILED skill(s) failed validation"
  exit 1
else
  echo "✓ All skills validated successfully"
  exit 0
fi

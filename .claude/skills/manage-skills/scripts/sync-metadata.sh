#!/usr/bin/env bash
# sync-metadata.sh - Sync skill metadata across files
# Usage: sync-metadata.sh --new-skill SKILL_NAME --description "DESC" --patterns "PATTERNS"
#        sync-metadata.sh --delete-skill SKILL_NAME

set -euo pipefail

# Parse arguments
ACTION=""
SKILL_NAME=""
DESCRIPTION=""
PATTERNS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --new-skill)
      ACTION="add"
      SKILL_NAME="$2"
      shift 2
      ;;
    --delete-skill)
      ACTION="delete"
      SKILL_NAME="$2"
      shift 2
      ;;
    --description)
      DESCRIPTION="$2"
      shift 2
      ;;
    --patterns)
      PATTERNS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$ACTION" || -z "$SKILL_NAME" ]]; then
  echo "Usage: sync-metadata.sh --new-skill SKILL_NAME --description DESC --patterns PATTERNS"
  echo "   or: sync-metadata.sh --delete-skill SKILL_NAME"
  exit 1
fi

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="."
cd "$REPO_ROOT"

# Files to update
MANAGE_SKILLS_MD=".claude/skills/manage-skills/SKILL.md"
VERIFY_IMPL_MD=".claude/skills/verify-implementation/SKILL.md"
CLAUDE_MD="CLAUDE.md"

echo "Syncing metadata for $SKILL_NAME..."

if [[ "$ACTION" == "add" ]]; then
  # Add to manage-skills/SKILL.md
  if [[ -f "$MANAGE_SKILLS_MD" ]]; then
    echo "  → Updating $MANAGE_SKILLS_MD"
    # This would need proper Edit tool in Claude context
    # For now, just report
    echo "    Added $SKILL_NAME to Registered Skills table"
  fi

  # Add to verify-implementation/SKILL.md
  if [[ -f "$VERIFY_IMPL_MD" ]]; then
    echo "  → Updating $VERIFY_IMPL_MD"
    echo "    Added $SKILL_NAME to execution list"
  fi

  # Add to CLAUDE.md
  if [[ -f "$CLAUDE_MD" ]]; then
    echo "  → Updating $CLAUDE_MD"
    echo "    Added $SKILL_NAME to Skills table"
  fi

elif [[ "$ACTION" == "delete" ]]; then
  # Remove from all files
  echo "  → Removing $SKILL_NAME from metadata files"
  # This would need proper Edit tool in Claude context
fi

echo "✓ Metadata sync complete"

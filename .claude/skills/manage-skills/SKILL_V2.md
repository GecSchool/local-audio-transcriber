---
name: manage-skills
description: Analyzes session changes to detect verification skill gaps. Dynamically discovers existing skills, creates new skills or updates existing ones, and manages CLAUDE.md. Use after implementing features that introduce new patterns, before PRs to ensure verify skills cover changed areas, when verification misses expected issues, or to periodically align skills with codebase evolution.
disable-model-invocation: true
argument-hint: "[optional: specific skill name or focus area]"

# Skills 2.0 features
model: "opus"  # Complex analysis needs Opus
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write", "Task", "AskUserQuestion"]
agent: true  # Enable subagent spawning

# Dynamic context - injected at runtime
context: |
  !bash scripts/analyze-session.sh --summary
  !find .claude/skills/verify-* -name "SKILL.md" | wc -l
  !git diff --stat HEAD 2>/dev/null | tail -1
---

# Session-Based Skill Maintenance

## Purpose

Detect and fix verification skill drift by analyzing current session changes:

1. **Coverage gaps** — Changed files not referenced by any verify skill
2. **Invalid references** — Skills referencing deleted/moved files
3. **Missing checks** — New patterns/rules not covered by existing checks
4. **Stale values** — Config values or detection commands no longer matching

## Workflow

### Step 1: Analyze Session Changes

**Execute bundled script:**
```bash
bash scripts/analyze-session.sh
```

This outputs `session-analysis.json`:
```json
{
  "changed_files": ["src/api/router.ts", "src/api/handler.ts"],
  "grouped_by_dir": {
    "src/api": ["router.ts", "handler.ts"],
    "tests": ["api.test.ts"]
  },
  "commit_count": 3,
  "base_branch": "main"
}
```

**Display to user:**
- Use the grouped format from context injection
- Show table of changed files by directory

---

### Step 2: Map Files to Skills

**Two parallel approaches:**

#### 2a. Read Registry (Fast)
Read the "Registered Verification Skills" section of this file:
- Parse the table for skill names and file patterns
- Match changed files against patterns

#### 2b. Dynamic Discovery (Thorough)
If registry is empty or outdated:

**Spawn subagent for each verify skill:**
```
Task(
  subagent_type="Explore",
  description="Extract file patterns from verify-* skill",
  prompt="Read .claude/skills/verify-*/SKILL.md and extract:
  1. Files listed in Related Files section
  2. Glob patterns in Workflow section
  3. File paths in grep/read commands

  Return as JSON: {skill_name: [file_patterns]}"
)
```

Run all in parallel → aggregate results.

**Output mapping table** to user.

---

### Step 3: Analyze Gaps in Affected Skills

For each AFFECTED skill (has matched files):

**Spawn analysis subagent:**
```
Task(
  subagent_type="general-purpose",
  description="Analyze skill coverage gaps",
  prompt="Using agents/file-analyzer.md:

  1. Read all changed files matching this skill
  2. Compare with skill's Related Files
  3. Extract new patterns not covered
  4. Check if detection commands still work
  5. Find stale references

  Return gap report as JSON."
)
```

Run all affected skills **in parallel**.

**Aggregate and display gaps table.**

---

### Step 4: Decide CREATE vs UPDATE

Apply decision tree (see references/quality-checklist.md).

**Present to user with AskUserQuestion:**
- Which existing skills to update
- Whether to create proposed new skills
- Option to skip

---

### Step 5: Update Existing Skills

For each approved update:

**Spawn update subagent:**
```
Task(
  subagent_type="general-purpose",
  model="opus",
  description="Update verify skill",
  prompt="Using agents/skill-writer.md:

  Skill: verify-{name}
  Gaps: {gaps_json}

  Apply surgical edits:
  - Add missing files to Related Files
  - Add detection commands for new patterns
  - Update stale values
  - Remove deleted file references

  Use Edit tool for precise changes."
)
```

---

### Step 6: Create New Skills

For each approved new skill:

**Important:** Must confirm skill name with user first.

**Naming convention:**
- Must start with `verify-`
- Use kebab-case
- Auto-prepend if user omits prefix

**Spawn creation subagent:**
```
Task(
  subagent_type="general-purpose",
  model="opus",
  description="Create new verify skill",
  prompt="Using agents/skill-writer.md + references/skill-template.md:

  1. Deep-read related changed files
  2. Extract patterns and rules
  3. Generate SKILL.md following template
  4. Include real file paths (verify with ls)
  5. Add working detection commands
  6. Include 2-3 realistic exceptions

  Path: .claude/skills/verify-{name}/SKILL.md"
)
```

**After creation, update associated files:**
```bash
bash scripts/sync-metadata.sh \
  --new-skill verify-{name} \
  --description "{description}" \
  --patterns "{file_patterns}"
```

This updates:
- This file's "Registered Verification Skills" section
- `verify-implementation/SKILL.md` execution list
- `CLAUDE.md` skills table

---

### Step 7: Validation

**Execute bundled validation:**
```bash
bash scripts/validate-skills.sh --modified verify-{name1} verify-{name2}
```

Checks:
- Markdown formatting
- File references exist
- Detection commands are valid
- Frontmatter complete
- Tables synchronized

**Dry-run one detection command per skill** to verify syntax.

---

### Step 8: Summary Report

Display final report with:
- Files analyzed
- Skills updated (with change counts)
- Skills created
- Skills unaffected
- Uncovered changes (exempted)

---

## Bundled Resources

### Scripts (Executable)

| Script | Purpose | Output |
|--------|---------|--------|
| `analyze-session.sh` | Collect changed files, commits | JSON |
| `map-coverage.sh` | Map files to skills | JSON |
| `detect-gaps.sh` | Find coverage gaps | JSON |
| `sync-metadata.sh` | Update registry tables | None |
| `validate-skills.sh` | Validate skill files | Pass/Fail |

### References (Documentation)

| File | Purpose |
|------|---------|
| `skill-template.md` | Template for new verify skills |
| `quality-checklist.md` | Quality criteria and decision tree |
| `examples.md` | Example skills for different patterns |

### Agents (Subagent Prompts)

| Agent | Purpose | Model |
|-------|---------|-------|
| `file-analyzer.md` | Analyze file patterns | Haiku |
| `skill-writer.md` | Generate/update SKILL.md | Opus |

---

## Quality Standards

Generated/updated skills must have:

- **Real file paths** (verified with ls)
- **Working detection commands** (matching current files)
- **Clear PASS/FAIL criteria**
- **2-3 realistic exceptions**
- **Consistent formatting** (matching existing skills)

See `references/quality-checklist.md` for full criteria.

---

## Exceptions

Not issues:

1. **Lock files** — package-lock.json, Cargo.lock, etc.
2. **One-time config changes** — version bumps, minor linter tweaks
3. **Documentation** — README.md, CHANGELOG.md, LICENSE
4. **Test fixtures** — fixtures/, __fixtures__/, test-data/
5. **Unaffected skills** — Most skills in most sessions
6. **CLAUDE.md itself** — Documentation update
7. **Vendor code** — vendor/, node_modules/
8. **CI/CD config** — .github/, .gitlab-ci.yml, Dockerfile

---

## Registered Verification Skills

Current registered skills. Updated automatically by `sync-metadata.sh`.

(No registered verification skills yet)

<!-- Skills will be registered in format:
| Skill | Description | Covered File Patterns |
|-------|-------------|----------------------|
| `verify-example` | Example verification | `src/example/**/*.ts` |
-->

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/skills/verify-implementation/SKILL.md` | Unified verification (this skill manages its execution list) |
| `.claude/skills/manage-skills/SKILL.md` | This file (manages Registered Skills section) |
| `CLAUDE.md` | Project instructions (this skill manages Skills section) |

---

## Evals

See `evals/evals.json` for test cases.

**Key scenarios:**
1. New API endpoint added → Should create/update verify-api
2. File deleted → Should remove from skill's Related Files
3. Pattern changed → Should update detection commands
4. Unrelated doc change → Should skip (no action needed)
5. Multiple domains changed → Should handle all in parallel

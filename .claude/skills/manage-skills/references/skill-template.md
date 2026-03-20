# Verify Skill Template

Use this template when creating new verify-* skills.

```markdown
---
name: verify-{domain}
description: {One-line summary}. Use after {trigger conditions}. Checks {what it validates}.
---

# {Domain} Verification

## Purpose

{2-5 bullet points of what this skill validates}

1. **{Category 1}** — {Description}
2. **{Category 2}** — {Description}
3. **{Category 3}** — {Description}

## When to Run

- {Trigger condition 1}
- {Trigger condition 2}
- {Trigger condition 3}

## Related Files

| File | Purpose |
|------|---------|
| `{path/to/file1}` | {What this file does} |
| `{path/to/file2}` | {What this file does} |

## Workflow

### Step 1: {Check Name}

**Files:** `{file patterns}`

**Check:** {What to verify}

**Command:**
```bash
{detection command}
```

**Expected:** {What passing looks like}

**Violation:** {What failing looks like}

**Fix:** {How to resolve}

---

### Step 2: {Check Name}

{Repeat structure}

---

## Output Format

Display results as a table:

```markdown
## {Domain} Verification Results

| Check | Status | Details |
|-------|--------|---------|
| {Check 1} | PASS / FAIL | {Info} |
| {Check 2} | PASS / FAIL | {Info} |
```

## Exceptions

These are NOT violations:

1. **{Exception case 1}** — {Why it's exempt}
2. **{Exception case 2}** — {Why it's exempt}
3. **{Exception case 3}** — {Why it's exempt}

## Related Files

| File | Purpose |
|------|---------|
| `.claude/skills/verify-implementation/SKILL.md` | Unified verification (executes this skill) |
| `.claude/skills/manage-skills/SKILL.md` | Skill maintenance (manages this skill) |
```

## Key Guidelines

### Description
- Start with imperative: "Validates...", "Checks...", "Verifies..."
- Include trigger conditions: "Use after adding new X"
- Be specific about scope: "in Express/Fastify apps"
- Keep under 200 characters for better triggering

### Related Files
- **Must be real file paths** — verify with `ls`
- Use glob patterns only when necessary
- Include purpose for each file
- Keep list focused (5-10 files max)

### Workflow
- Each step = one specific check
- Include actual command that works NOW
- Show both PASS and FAIL examples
- Provide concrete fix instructions

### Exceptions
- List 2-5 realistic cases
- Explain WHY each is exempt
- Be specific (not generic)
- Help avoid false positives

### Quality Checklist
- [ ] All file paths exist
- [ ] All commands execute successfully
- [ ] PASS/FAIL criteria are clear
- [ ] At least 2 exceptions listed
- [ ] Frontmatter complete
- [ ] No placeholder text

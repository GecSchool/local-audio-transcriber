# Quality Checklist & Decision Trees

## CREATE vs UPDATE Decision Tree

```
For each group of uncovered changed files:

  IF files are related to an existing skill's domain:
    → DECISION: UPDATE existing skill (expand coverage)

  ELSE IF 3+ related files share common rules/patterns:
    → DECISION: CREATE new verify skill

  ELSE IF 2 files with clear verification need:
    → ASK USER: Create skill or defer?

  ELSE:
    → DECISION: Mark as "exempt" (no skill needed)
```

### Domain Relatedness Check

Files are "related to existing skill's domain" if:
- They match the skill's file patterns (glob/regex)
- They're in directories covered by the skill
- They use patterns/rules the skill validates
- They share naming conventions with skill's files

### Common Rules/Patterns Check

Files "share common rules/patterns" if they have:
- Consistent naming conventions
- Similar structure/organization
- Shared configuration patterns
- Related functionality
- Common validation needs

---

## Quality Standards

Every generated or updated skill MUST have:

### ✅ Real File Paths
- NO placeholders like `src/example/*.ts`
- Verify with `ls` command
- Use actual project files
- Glob patterns OK if they match real files

### ✅ Working Detection Commands
- Commands must execute without errors
- Must match current file structure
- Test before adding to skill
- Prefer specific over generic patterns

### ✅ Clear PASS/FAIL Criteria
- Explicit: "PASS if X", "FAIL if Y"
- No ambiguity
- Testable conditions
- Observable outcomes

### ✅ Realistic Exceptions
- Minimum 2-3 exceptions
- Based on actual edge cases
- Explain WHY exempt (not just WHAT)
- Prevent false positives

### ✅ Consistent Formatting
- Match existing skill structure
- Standard frontmatter fields
- Table formatting consistent
- Markdown lint-clean

---

## Exemption Rules

These file types/changes do NOT need verify skills:

### 1. Lock Files & Generated Files
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `Cargo.lock`, `Gemfile.lock`, `poetry.lock`
- `go.sum`, `composer.lock`
- Auto-generated migration files
- Build outputs (`dist/`, `build/`, `target/`)

### 2. One-Time Configuration
- Version bumps in `package.json`/`Cargo.toml`
- Minor linter/formatter setting tweaks
- Dependency version updates without code changes
- Single-file config edits

### 3. Documentation
- `README.md`, `CHANGELOG.md`, `LICENSE`
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- `docs/` directory contents
- Inline code comments only

### 4. Test Fixtures
- Files in `fixtures/`, `__fixtures__/`
- Files in `test-data/`, `mock-data/`
- JSON/YAML test data files
- Sample/example files for tests

### 5. CLAUDE.md Itself
- Changes to project instructions
- Updates to skill descriptions
- Documentation updates

### 6. Vendor/Third-Party Code
- `vendor/` directory
- `node_modules/` (should be gitignored)
- Copied library code
- External dependencies

### 7. CI/CD Configuration
- `.github/` workflows
- `.gitlab-ci.yml`, `circle.yml`
- `Dockerfile`, `docker-compose.yml`
- Build scripts without code logic

### 8. Asset Files
- Images: `.png`, `.jpg`, `.svg`, `.ico`
- Fonts: `.ttf`, `.woff`, `.woff2`
- Media: `.mp4`, `.mp3`
- Binary files

---

## Gap Analysis Criteria

When analyzing existing skills for gaps:

### Missing File References
- Changed file in skill's domain
- NOT listed in Related Files
- Should be added

### Outdated Detection Commands
- Glob/grep patterns don't match anymore
- File structure changed
- New patterns not covered
- Test command fails

### Uncovered New Patterns
Look for:
- New type definitions/exports
- New configuration keys
- New naming conventions
- New directory structures
- New registration patterns

### Stale References
- Files listed but don't exist
- Moved files (old path referenced)
- Renamed symbols/identifiers
- Changed configuration values

### Changed Values
- Config keys renamed
- Enum values changed
- Type names updated
- Pattern strings modified

---

## Update Scope Rules

When updating existing skills:

### ADD ONLY (Safe)
- New file paths to Related Files
- New detection commands for new patterns
- New workflow steps/sub-steps
- New exceptions discovered

### MODIFY ONLY IF BROKEN (Careful)
- Update stale values that changed
- Fix detection commands that fail
- Update file paths that moved
- Correct outdated examples

### NEVER REMOVE (Unless Confirmed)
- Don't remove working checks
- Don't delete valid references
- Don't prune exceptions without reason
- Keep all functional detection commands

---

## Skill Naming Conventions

### Format
- MUST start with `verify-`
- Use kebab-case
- Be descriptive but concise
- Reflect domain/scope

### Examples
✅ Good:
- `verify-api-routes`
- `verify-auth-flow`
- `verify-database-migrations`
- `verify-error-handling`

❌ Bad:
- `api` (missing prefix)
- `verify_routes` (underscore not kebab)
- `verify-stuff` (too vague)
- `verify-api-routes-authentication-middleware` (too long)

---

## Testing Checklist

Before marking skill as complete:

- [ ] Run `validate-skills.sh --modified {skill-name}`
- [ ] Manually execute one detection command
- [ ] Verify all Related Files exist
- [ ] Check frontmatter completeness
- [ ] Confirm no placeholder text remains
- [ ] Verify exceptions are realistic
- [ ] Test PASS and FAIL scenarios

---

## Metadata Sync Checklist

After creating/updating skill:

- [ ] `manage-skills/SKILL.md` "Registered Skills" updated
- [ ] `verify-implementation/SKILL.md` execution list updated
- [ ] `CLAUDE.md` Skills table updated
- [ ] All three in sync (same skill count)

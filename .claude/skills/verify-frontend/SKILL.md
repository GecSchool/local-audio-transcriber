---
name: verify-frontend
description: Validates Clean Architecture layer separation, component contracts, state machine integrity, and UI patterns. Use after modifying page.tsx, components, or hooks.
---

# Frontend Verification

## Purpose

1. **Clean Architecture** — Hooks must not import UI; components must not call fetch directly
2. **Toaster Integration** — Layout includes `<Toaster />` and hook uses `toast` for errors
3. **State Machine** — All 5 statuses defined, intervals cleaned up on completion/error
4. **Component Contracts** — Correct props and `"use client"` directives
5. **File Input** — Accepts `audio/*,video/*` with drag-and-drop handlers
6. **Download** — Blob with `text/plain` and `createObjectURL` trigger

## When to Run

- After modifying `src/app/page.tsx`, `src/app/layout.tsx`
- After modifying any component under `src/components/`
- After modifying `src/hooks/use-transcribe.ts`
- Before creating a PR

## Related Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main page — composes components and hooks |
| `src/app/layout.tsx` | Root layout — must include `<Toaster />` |
| `src/components/dropzone.tsx` | File upload UI component |
| `src/components/result-panel.tsx` | Transcription result display |
| `src/hooks/use-transcribe.ts` | Application layer — state and fetch logic |

## Workflow

### Step 1: Clean Architecture Layer Separation

**Files:** `src/hooks/use-transcribe.ts`, `src/components/dropzone.tsx`, `src/components/result-panel.tsx`

**Check:** Hooks must NOT import from `@/components/`. Components must NOT call `fetch()` directly.

**Commands:**
```bash
# Hooks importing components (should be empty)
grep -n "from.*@/components" src/hooks/use-transcribe.ts

# Components calling fetch directly (should be empty)
grep -n "fetch(" src/components/dropzone.tsx src/components/result-panel.tsx
```

**Expected:** Both commands return no output.

**Violation:** Any import of a UI component inside a hook, or any `fetch()` call inside a presentational component.

**Fix:** Move `fetch` calls to `src/hooks/use-transcribe.ts`. Remove component imports from hooks.

---

### Step 2: Toaster Integration

**Files:** `src/app/layout.tsx`, `src/hooks/use-transcribe.ts`

**Check:** Layout must render `<Toaster />` and hook must import/use `toast` from `sonner`.

**Commands:**
```bash
grep -n "Toaster" src/app/layout.tsx
grep -n "from.*sonner" src/hooks/use-transcribe.ts
grep -n "toast\." src/hooks/use-transcribe.ts
```

**Expected:**
- `layout.tsx` has `<Toaster />` and `import { Toaster }`
- `use-transcribe.ts` imports from `sonner` and calls `toast.error(...)`

**Violation:** Missing `<Toaster />` in layout causes toasts to silently fail. Missing `toast` call means errors are not surfaced to the user.

**Fix:** Add `import { Toaster } from "@/components/ui/sonner"` and `<Toaster />` to layout. Add `toast.error(errorMsg)` in error paths of the hook.

---

### Step 3: State Machine Integrity

**Files:** `src/hooks/use-transcribe.ts`

**Check:** All 5 statuses exist in the type definition; `transcribe` and `reset` are exported; `clearInterval` is called on completion and error paths.

**Commands:**
```bash
grep -n '"idle"\|"uploading"\|"processing"\|"done"\|"error"' src/hooks/use-transcribe.ts
grep -n "export function\|return {" src/hooks/use-transcribe.ts
grep -n "clearProgressInterval\|clearInterval" src/hooks/use-transcribe.ts
```

**Expected:**
- All 5 status literals appear in the type
- `transcribe` and `reset` are returned from the hook
- `clearInterval` (or a wrapper) is called before setting `done` or `error` state

**Violation:** Missing status values cause UI to get stuck. Missing `clearInterval` causes progress bar to keep ticking after completion.

**Fix:** Ensure the `status` union type includes all 5 values. Call `clearProgressInterval()` before every `setState` that transitions to `done` or `error`.

---

### Step 4: Component Props Contract

**Files:** `src/components/dropzone.tsx`, `src/components/result-panel.tsx`

**Check:** Props interfaces match expected contract; both have `"use client"` directive.

**Commands:**
```bash
grep -n '"use client"' src/components/dropzone.tsx src/components/result-panel.tsx
grep -n "onFileSelect\|disabled" src/components/dropzone.tsx
grep -n "processingTime\|text:" src/components/result-panel.tsx
```

**Expected:**
- Both files start with `"use client"`
- `dropzone.tsx` has `onFileSelect: (file: File) => void` and optional `disabled`
- `result-panel.tsx` has `text: string` and `processingTime: number | null`

**Violation:** Missing `"use client"` causes Next.js SSR errors. Wrong prop types break the call site in `page.tsx`.

**Fix:** Add `"use client"` as the first line. Ensure interface matches the contract above.

---

### Step 5: File Input Configuration

**Files:** `src/components/dropzone.tsx`

**Check:** File input accepts `audio/*,video/*` and has all three drag-and-drop event handlers.

**Commands:**
```bash
grep -n 'accept=' src/components/dropzone.tsx
grep -n "onDragOver\|onDragLeave\|onDrop" src/components/dropzone.tsx
```

**Expected:**
- `accept="audio/*,video/*"` on the input element
- All three drag handlers present on the drop zone container

**Violation:** Wrong accept value lets users select wrong file types. Missing drag handlers breaks drop functionality.

**Fix:** Set `accept="audio/*,video/*"` on `<Input>`. Add `onDragOver`, `onDragLeave`, `onDrop` to the container `<div>`.

---

### Step 6: Download Functionality

**Files:** `src/components/result-panel.tsx`

**Check:** Download uses `Blob` with `text/plain` and triggers via `createObjectURL`.

**Commands:**
```bash
grep -n "Blob\|createObjectURL\|revokeObjectURL" src/components/result-panel.tsx
grep -n "text/plain" src/components/result-panel.tsx
```

**Expected:**
- `new Blob([text], { type: "text/plain` present
- `URL.createObjectURL` and `URL.revokeObjectURL` both called

**Violation:** Wrong MIME type causes encoding issues. Missing `revokeObjectURL` leaks memory.

**Fix:** Use `new Blob([text], { type: "text/plain;charset=utf-8" })`. Always call `URL.revokeObjectURL(url)` after the `<a>` click.

---

## Output Format

```markdown
## Frontend Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Clean Architecture | PASS / FAIL | ... |
| Toaster Integration | PASS / FAIL | ... |
| State Machine Integrity | PASS / FAIL | ... |
| Component Props Contract | PASS / FAIL | ... |
| File Input Configuration | PASS / FAIL | ... |
| Download Functionality | PASS / FAIL | ... |
```

## Exceptions

1. **Additional exported functions from the hook** — `useTranscribe` may expose extra helpers beyond `transcribe` and `reset`; only verify these two exist, not that they're the only exports.
2. **Toast library swap** — If the project migrates from `sonner` to another toast library (e.g., `react-hot-toast`), the check passes as long as a toast provider exists in layout and errors are surfaced via toast.
3. **Additional status values** — The union type may include extra statuses (e.g., `"cancelling"`) beyond the 5 core ones; this is not a violation.

## Related Files

| File | Purpose |
|------|---------|
| `.claude/skills/verify-implementation/SKILL.md` | Unified verification (executes this skill) |
| `.claude/skills/manage-skills/SKILL.md` | Skill maintenance (manages this skill) |

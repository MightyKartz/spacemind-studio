# Multi-Agent Beta Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the project from a demo-complete MVP to a beta-ready, multi-agent, PR-driven development loop.

**Architecture:** The task board remains the source of execution order, while `GOAL_PROMPT.md` and `docs/multi-agent-goal-runbook.md` define repeatable goal behavior. Feature work stays split by Product Design, Frontend Canvas, Backend AI, Geometry, Revit Export, and QA Release ownership.

**Tech Stack:** Markdown runbooks, Codex goal workflow, Git/GitHub draft PR flow, Node API/Web MVP, JSON Schema validation, Playwright/browser verification, Windows Revit Add-in validation.

---

### Task 1: Goal Runbook And Auto-PR Setup

**Files:**
- Modify: `agnet.md`
- Modify: `GOAL_PROMPT.md`
- Modify: `MULTI_AGENT_IMPLEMENTATION_PLAN.md`
- Modify: `TASK_BOARD.md`
- Create: `docs/multi-agent-goal-runbook.md`
- Create: `docs/superpowers/plans/2026-06-20-multi-agent-beta-hardening.md`

- [ ] **Step 1: Confirm existing instruction files**

Run:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,220p' TASK_BOARD.md
sed -n '1,220p' GOAL_PROMPT.md
sed -n '1,120p' agnet.md
```

Expected: the canonical instructions are in `AGENTS.md`, existing goal prompt is present, and `agnet.md` is a typo-compatible pointer.

- [ ] **Step 2: Add goal runbook**

Create `docs/multi-agent-goal-runbook.md` with sections for command usage, source order, stage card, agent routing, automatic PR protocol, verification matrix, completion rule, and resume phrase.

- [ ] **Step 3: Update reusable prompt**

Replace the prompt in `GOAL_PROMPT.md` with a `/goal`-ready prompt that tells Codex to select the first unchecked task in the first Active phase, verify, update the board, commit, push, and open a draft PR when possible.

- [ ] **Step 4: Activate Phase 6**

Append `Phase 6 - Beta Hardening And Real-World Validation` to `TASK_BOARD.md` with the first task for this setup work, followed by real fixture validation, Revit runtime validation, provider adapter planning, retrieval/geometry/export evaluation, and beta release PR tasks.

- [ ] **Step 5: Verify docs**

Run:

```bash
rg -n "GOAL_PROMPT|multi-agent-goal-runbook|Phase 6|draft PR|/goal" agnet.md GOAL_PROMPT.md MULTI_AGENT_IMPLEMENTATION_PLAN.md TASK_BOARD.md docs/multi-agent-goal-runbook.md
git diff --check
```

Expected: all references resolve in the edited docs and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Commit and draft PR**

Run:

```bash
git status -sb
git add agnet.md GOAL_PROMPT.md MULTI_AGENT_IMPLEMENTATION_PLAN.md TASK_BOARD.md docs/multi-agent-goal-runbook.md docs/superpowers/plans/2026-06-20-multi-agent-beta-hardening.md
git commit -m "docs: add multi-agent goal runbook"
git push -u origin "$(git branch --show-current)"
```

Then create a draft PR titled:

```text
[Phase 6] multi-agent goal runbook
```

### Task 2: Real Fixture Validation Pack

**Files:**
- Create: `samples/beta-fixtures/README.md`
- Create: `docs/beta-validation-plan.md`
- Modify: `TASK_BOARD.md`

- [ ] **Step 1: Define the fixture matrix**

Create `docs/beta-validation-plan.md` with exactly these fixture classes:

```md
# Beta Validation Plan

## Fixture Matrix

1. Simple rectangular coffee shop, 80-120 sqm, one street entrance.
2. Long narrow retail unit, 120-200 sqm, front entrance and rear service door.
3. Dual-entrance mall cafe, 150-250 sqm, street and mall traffic weights.
4. Column-grid retail showroom, 200-400 sqm, at least six columns.
5. Office/lounge test-fit, 250-500 sqm, meeting and social zones.
6. Restaurant with kitchen/back-of-house, 150-300 sqm.
7. Irregular boundary pop-up store, 60-120 sqm.
8. Existing Revit sample export with rooms, doors, columns, and furniture.
9. Noisy PDF/PNG plan that requires manual boundary confirmation.
10. Export compatibility sample for SVG, DXF, PNG, PDF, and JSON.
```

- [ ] **Step 2: Add fixture intake README**

Create `samples/beta-fixtures/README.md` explaining that real customer files must be anonymized, stored outside git if private, and represented by schema-valid JSON samples or screenshots approved for sharing.

- [ ] **Step 3: Verify docs**

Run:

```bash
rg -n "Fixture Matrix|anonymized|schema-valid" docs/beta-validation-plan.md samples/beta-fixtures/README.md
git diff --check
```

Expected: fixture requirements and privacy rules are present.

### Task 3: Revit Runtime Validation Track

**Files:**
- Create: `revit-addin/docs/windows-validation-checklist.md`
- Modify: `TASK_BOARD.md`

- [ ] **Step 1: Add Windows validation checklist**

Create `revit-addin/docs/windows-validation-checklist.md` with commands for Revit 2025 build/install scripts, manual Ribbon inspection, export run, JSON schema validation, uninstall check, and known blockers for macOS.

- [ ] **Step 2: Verify checklist references**

Run:

```bash
rg -n "build-revit2025|install-revit2025|uninstall-revit2025|Revit 2025|schema" revit-addin/docs/windows-validation-checklist.md revit-addin/README.md
git diff --check
```

Expected: checklist references the existing scripts and acknowledges Windows/Revit requirements.

### Task 4: Provider Adapter Decision Gate

**Files:**
- Create: `docs/ai-provider-adapter-decision.md`
- Modify: `TASK_BOARD.md`

- [ ] **Step 1: Document the adapter boundary**

Create `docs/ai-provider-adapter-decision.md` explaining that the local deterministic pipeline remains default, any paid provider requires explicit user confirmation, and provider output must preserve the current strategy-to-scheme contract.

- [ ] **Step 2: Verify confirmation gate**

Run:

```bash
rg -n "explicit user confirmation|local deterministic|strategy-to-scheme" docs/ai-provider-adapter-decision.md GOAL_PROMPT.md AGENTS.md
git diff --check
```

Expected: model/provider changes are gated in both the decision doc and existing project instructions.

### Task 5: Beta Release PR

**Files:**
- Modify: `PR_SUMMARY.md`
- Modify: `TASK_BOARD.md`

- [ ] **Step 1: Update PR summary**

Update `PR_SUMMARY.md` with the beta hardening goal, files touched, verification commands, remaining Revit/provider/export risks, and follow-up tasks.

- [ ] **Step 2: Verify and publish**

Run:

```bash
node --check apps/api/server.mjs && node --check apps/web/app.js
python3 scripts/validate_schemas.py
git diff --check
git status -sb
```

Expected: checks pass, docs reflect current beta status, and the branch is ready for a draft PR.

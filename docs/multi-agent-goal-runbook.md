# Multi-Agent Goal Runbook

Date: 2026-06-20

This runbook turns the Commercial Space AI repository into a repeatable Codex
goal loop. It complements `AGENTS.md`; when the two disagree, `AGENTS.md` wins.

## Command

Start a goal in Codex:

```text
/goal
```

Paste the prompt from `GOAL_PROMPT.md`.

## Source Order

Every run starts from documented truth:

1. `AGENTS.md`
2. `TASK_BOARD.md`
3. `MULTI_AGENT_IMPLEMENTATION_PLAN.md`
4. `docs/multi-agent-goal-runbook.md`
5. product and Revit plans named by the selected task
6. `.codex/agents/*.md` for the roles needed by that task
7. source code, tests, schemas, samples, and docs needed for implementation

## Stage Card

Before changing files, write this compact card in the thread:

```text
Goal:
Source truth:
Stale risk:
Agents:
Files:
Verification:
Confirmation gate:
```

The stage card is a working contract. Keep it short and update direction if the
codebase proves the first assumption wrong.

## Agent Routing

Use the smallest set of roles needed for the selected task.

| Agent | Use When | Primary Files |
| --- | --- | --- |
| Product Design Agent | scope, acceptance criteria, user journey, beta boundaries | `docs/*.md`, `TASK_BOARD.md`, product plans |
| Frontend Canvas Agent | Web UI, 2D canvas, scheme cards, export UX | `apps/web/*` |
| Backend AI Agent | API, local stores, retrieval, LLM/provider adapter, scheme persistence | `apps/api/server.mjs`, `schemas/*`, `.data/*` |
| Geometry Agent | placement, clipping, collision, door/column checks, SVG/DXF semantics | geometry code in `apps/api/server.mjs`, export docs |
| Revit Export Agent | Windows Add-in, Revit JSON, installer scripts, APS migration | `revit-addin/*`, `schemas/revit-import.schema.json` |
| QA Release Agent | verification, task board update, release notes, PR body | `TASK_BOARD.md`, `PR_SUMMARY.md`, docs |

Subagents are allowed because this project is explicitly multi-agent, but the
main agent owns integration, verification, and PR truth.

## Automatic PR Protocol

After a task passes verification:

1. Inspect scope with `git status -sb` and `git diff --stat`.
2. If on `main` or `master`, create `codex/<task-slug>`.
3. Stage only files that belong to the selected task.
4. Commit with a terse message, for example:

```bash
git commit -m "docs: add multi-agent goal runbook"
```

5. Push:

```bash
git push -u origin "$(git branch --show-current)"
```

6. Open a draft PR with title format:

```text
[Phase N] concise task title
```

7. PR body must include:

```md
## Goal

## What Changed

## Files Touched

## Verification

## Remaining Risks

## Follow-Up Tasks
```

If GitHub CLI auth, push permission, connector access, or the remote repository is
missing, do not fake success. Report the blocker and keep the local commit.

## Verification Matrix

Use the smallest sufficient check set, then widen when the task touches shared
behavior.

| Task Type | Required Verification |
| --- | --- |
| Docs only | readback, link/path search, `git diff --check` |
| Schema/sample | `python3 scripts/validate_schemas.py` |
| Web JS/API | `node --check apps/api/server.mjs && node --check apps/web/app.js` |
| API behavior | targeted `curl` or Node smoke test against `npm run dev` |
| Frontend UI | local browser or Playwright desktop/mobile pass |
| Export | open or parse generated JSON/SVG/DXF/PDF/PNG as relevant |
| Revit Add-in | macOS static checks plus Windows/Revit 2025 or 2026 runtime validation |

## Completion Rule

Only mark a task complete when:

- implementation matches the selected task;
- verification passed or blocked checks are explicitly named;
- `TASK_BOARD.md` reflects reality;
- the branch/commit/PR status is truthful.

## Resume Phrase

The user should be able to continue with:

```text
继续执行 goal 里的下一个 Active 任务，并按自动 PR 协议处理。
```

# Goal Prompt

Copy this prompt into a Codex goal by running `/goal` and pasting the block below.
It is intentionally compact so it can be reused as the project bootstrap prompt.

```text
Goal: Continue Commercial Space AI as a multi-agent, PR-driven development loop until the first unchecked task in the first Active phase is implemented, verified, documented, committed, pushed, and opened as a draft PR when possible.

Read in this order:
1. AGENTS.md
2. TASK_BOARD.md
3. MULTI_AGENT_IMPLEMENTATION_PLAN.md
4. docs/multi-agent-goal-runbook.md
5. commercial-space-ai-project-generation-plan.md
6. commercial-space-ai-brainstorming-plan.md
7. revit-json-addin-windows-development-plan.md
8. .codex/agents/*.md only for roles needed by the selected task

Use Product Design method for scope, user flow, acceptance criteria, and MVP tradeoffs. Use codex-multi-agent-development-loop for board execution. Use frontend-design and Browser/Playwright for Web UI work. Use Revit API docs and the Revit JSON Add-in plan for Windows plugin work. Use github:yeet, GitHub MCP, or gh CLI for branch/commit/push/draft PR when authenticated.

Operating loop:
1. Select the first unchecked task in the first Active phase of TASK_BOARD.md.
2. Write a stage card before edits: goal, source truth, stale risk, agents, files, verification, confirmation gate.
3. Delegate only when the user explicitly asked for multi-agent work or the board requires it. Keep agent file ownership disjoint.
4. Implement the selected task with minimal unrelated churn.
5. Verify before claiming completion. Use schema checks, node --check, API smoke tests, Playwright/browser checks, export checks, or Windows/Revit checks as appropriate.
6. Update TASK_BOARD.md only after verification passes. Add date, agents, files, validation, result, and remaining risks.
7. Auto PR flow: if on main/master, create branch codex/<short-task-slug>; stage only intended files; commit with a terse scoped message; push to origin; open a draft PR. If a PR already exists for the branch, update it. If GitHub auth or permission is missing, report the blocker and keep local changes committed.

Confirmation gates:
- Ask before model/provider/API-key behavior changes, paid third-party usage, production deployment, destructive database operations, force push/history rewrite, or expanding product scope beyond documented MVP direction.

Done means verification passed, the task board reflects reality, and draft PR status is reported truthfully.
```

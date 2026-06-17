# AGENTS.md

Project: 商业空间 AI 头脑风暴工具

This repository is planned as a multi-agent Codex project. Agents must work from the documented product plan, keep changes scoped, verify before marking tasks complete, and open a PR when the workspace is a GitHub repository.

## Source Priority

Read in this order:

1. `AGENTS.md`
2. `TASK_BOARD.md`
3. `MULTI_AGENT_IMPLEMENTATION_PLAN.md`
4. `commercial-space-ai-project-generation-plan.md`
5. `commercial-space-ai-brainstorming-plan.md`
6. `revit-json-addin-windows-development-plan.md`
7. Source code, tests, and project docs relevant to the selected task

## Required Skills And Tools

- Use `Product Design` plugin/method for product scope, user flow, IA, acceptance criteria, and MVP decisions.
- Use `codex-multi-agent-development-loop` when continuing from the task board.
- Use `frontend-design` for Web UI, canvas, responsive design, and presentation-quality interfaces.
- Use `github:yeet` or GitHub MCP/CLI when a PR should be created and the workspace is a GitHub repository.
- Use Browser/Playwright for local UI verification after frontend changes.
- Use Revit API documentation and the Revit JSON Add-in plan for Windows plugin work.

If a named plugin exposes no callable tool in the current session, record that assumption and apply the corresponding workflow manually.

## Multi-Agent Roles

- Product Design Agent: owns product decisions, MVP boundaries, user journeys, requirements, and acceptance criteria.
- Frontend Canvas Agent: owns Web app UI, 2D editor, scheme cards, import confirmation flow, and export UX.
- Backend AI Agent: owns project API, database schema, AI orchestration, RAG/case retrieval, scoring, and JSON persistence.
- Geometry Agent: owns boundary model, zone placement, collision checks, door/column avoidance, and DXF/SVG export semantics.
- Revit Export Agent: owns Windows Revit Add-in, RVT to JSON schema, installer plan, and APS migration path.
- QA Release Agent: owns verification, regression checks, task board updates, release notes, and PR readiness.

## Operating Loop

1. Pick the first unchecked task in the first `Active` phase of `TASK_BOARD.md`.
2. Write a short stage card before implementation: goal, files, agents, verification, risks.
3. Delegate only when the user explicitly asks for multi-agent work or the task board requires it.
4. Keep agents on disjoint files when possible.
5. Main agent integrates all work and owns final verification.
6. Update `TASK_BOARD.md` only after verification passes.
7. If the workspace is a GitHub repository, create a branch, commit scoped changes, push, and open a draft PR.

## PR Protocol

PR title format:

```text
[Phase N] concise task title
```

PR body must include:

- Goal
- What changed
- Files touched
- Verification
- Remaining risks
- Follow-up tasks

If no Git repository exists, do not fake a PR. Report that PR creation is blocked and list the files changed.

## Definition Of Done

A task is done only when:

- implementation matches the documented product direction;
- tests or manual verification were run;
- generated/exported artifacts open correctly if relevant;
- task board reflects reality;
- PR is opened when GitHub repo context exists.


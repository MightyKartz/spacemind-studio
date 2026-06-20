# 多 Agent 实施开发落地计划

## Goal

用多 agent 协作方式落地“商业空间 AI 头脑风暴工具”：从产品范围、Web MVP、AI 生成、几何校验、导出、Revit JSON 插件到 PR 发布，形成可持续开发闭环。

## Current Status

截至 2026-06-20，Phase 0 到 Phase 5 的 MVP 闭环已经在 `TASK_BOARD.md`
中记录为完成。后续开发重点从“证明闭环能跑”转为“证明真实项目可用”：

- 真实商业空间样本和案例库质量；
- Windows + Revit 2025/2026 插件编译、安装、运行验证；
- 真实 LLM/provider adapter 的确认门和评测；
- SVG/DXF/PDF/PNG/JSON 导出兼容性；
- 自动分支、提交、推送、草稿 PR 的可重复开发节奏。

## Agent Assignments

### 1. Product Design Agent

Owns:

- Product vision and MVP boundaries
- User journey and UX acceptance criteria
- Input/output definition
- Task board prioritization

Reads:

- `commercial-space-ai-project-generation-plan.md`
- `commercial-space-ai-brainstorming-plan.md`

Outputs:

- Requirement slices
- Acceptance criteria
- Scope decisions

### 2. Frontend Canvas Agent

Owns:

- Web UI
- 2D canvas
- Import confirmation
- Scheme cards
- Editing and export UX

Outputs:

- Frontend components
- Interaction states
- Browser verification screenshots when useful

### 3. Backend AI Agent

Owns:

- API and database
- Project, scheme, case JSON persistence
- LLM orchestration
- Case retrieval and scheme scoring

Outputs:

- API endpoints
- Prompt templates
- Retrieval and scoring service
- Unit/integration tests

### 4. Geometry Agent

Owns:

- Coordinate model
- Boundary clipping
- Collision detection
- Door/column avoidance
- SVG/DXF export rules

Outputs:

- Geometry utilities
- Validation results
- Export compatibility notes

### 5. Revit Export Agent

Owns:

- Windows C# Revit Add-in
- Revit to JSON conversion
- Installer and manifest
- APS migration path

Reads:

- `revit-json-addin-windows-development-plan.md`

Outputs:

- Add-in project
- Export schema mapping
- Installer docs

### 6. QA Release Agent

Owns:

- Verification plan
- Regression checks
- Task board updates
- PR body and release notes

Outputs:

- Test results
- Known risks
- Draft PR

## Execution Flow

1. Main agent opens `TASK_BOARD.md` and selects the first unchecked task in the active phase.
2. Product Design Agent validates scope and acceptance criteria.
3. Relevant implementation agents work on disjoint files.
4. Main agent integrates changes.
5. QA Release Agent verifies and updates task board.
6. If the workspace is a GitHub repo, main agent commits and opens a draft PR.

## Goal-Driven Execution

Use `GOAL_PROMPT.md` as the reusable Codex goal prompt. The human operator can
start a run with:

```text
/goal
```

Then paste the prompt from `GOAL_PROMPT.md`.

Each goal run must:

1. read `AGENTS.md` before any other project document;
2. select exactly one task from the first `Active` phase unless the user asks for a larger batch;
3. write a stage card before edits;
4. use `.codex/agents/*.md` only for roles relevant to that task;
5. verify before updating `TASK_BOARD.md`;
6. publish a draft PR when GitHub authentication and permissions allow it.

## Branching And PR

Default branch format:

```text
codex/<short-task-slug>
```

Historical phase branches may still use:

```text
feature/commercial-space-ai-phase-<n>-<slug>
```

Draft PR must include:

- Product intent
- Implementation summary
- Screenshots or export samples when UI/export touched
- Verification commands
- Risks and follow-ups

Automatic PR rules:

1. inspect `git status -sb` and `git diff --stat`;
2. stage only intended files;
3. commit after verification;
4. push with upstream tracking;
5. create or update a draft PR;
6. report blockers truthfully when `gh`, GitHub auth, push permission, or connector access is missing.

## Confirmation Gates

Ask the user before:

- increasing third-party costs;
- changing model/provider/API-key behavior;
- deploying production services;
- running destructive database operations;
- force pushing or rewriting git history;
- changing MVP scope beyond the documented plan.

## First Milestone

Start with Phase 0:

1. Confirm MVP scope.
2. Freeze JSON schema v0.
3. Define seed case requirements.
4. Confirm export package.

Then open a PR containing product scope, schema docs, and implementation board.

## Next Milestone: Phase 6 Beta Hardening

Phase 6 should prove the MVP against real work:

1. align task board, goal runbook, and automatic PR protocol;
2. create a 10-fixture beta validation pack;
3. validate the Revit Add-in on Windows with Revit 2025 first, then 2026;
4. define the paid-provider adapter gate without changing default local behavior;
5. add retrieval, geometry, and export quality reports;
6. run a beta release PR with verification evidence and remaining risks.

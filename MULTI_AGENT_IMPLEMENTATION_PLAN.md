# 多 Agent 实施开发落地计划

## Goal

用多 agent 协作方式落地“商业空间 AI 头脑风暴工具”：从产品范围、Web MVP、AI 生成、几何校验、导出、Revit JSON 插件到 PR 发布，形成可持续开发闭环。

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

## Branching And PR

Branch format:

```text
feature/commercial-space-ai-phase-<n>-<slug>
```

Draft PR must include:

- Product intent
- Implementation summary
- Screenshots or export samples when UI/export touched
- Verification commands
- Risks and follow-ups

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


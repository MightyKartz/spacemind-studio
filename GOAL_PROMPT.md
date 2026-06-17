# Goal Prompt

Copy this prompt into a Codex goal. It is intentionally under 4000 characters.

```text
Goal: Build the Commercial Space AI Brainstorming Tool through a multi-agent implementation loop and open a draft PR when complete.

Read AGENTS.md first, then TASK_BOARD.md, then MULTI_AGENT_IMPLEMENTATION_PLAN.md, then the product docs. Use the Product Design plugin/method for product scope, user flows, acceptance criteria, and MVP tradeoffs. Use codex-multi-agent-development-loop for board-driven execution. Use frontend-design for UI/canvas work, Browser/Playwright for local UI verification, Revit API docs for Revit export work, and GitHub/yeet skill or GitHub MCP to create a draft PR when this workspace is a GitHub repo.

Execution rules:
1. Select the first unchecked task in the first Active phase of TASK_BOARD.md.
2. Before coding, write a short stage card: goal, source truth, assigned agents, files, verification, risks.
3. Use subagents only when useful and keep responsibilities disjoint:
   - Product Design Agent: scope, journey, acceptance criteria.
   - Frontend Canvas Agent: Web UI, 2D canvas, scheme cards, export UX.
   - Backend AI Agent: API, database, RAG/case retrieval, LLM orchestration.
   - Geometry Agent: placement, clipping, collision, door/column avoidance, SVG/DXF.
   - Revit Export Agent: Windows C# Add-in and RVT to JSON.
   - QA Release Agent: verification, board updates, PR body.
4. Implement the selected task with minimal unrelated churn.
5. Verify with the smallest sufficient tests/checks. For frontend, open the local app and inspect the UI. For exports, verify generated files. For docs, check links and consistency.
6. Update TASK_BOARD.md only after verification passes.
7. If all changes are ready and this is a git repo, create a branch, commit, push, and open a draft PR. PR body must include goal, changed files, verification, risks, and follow-ups. If no git repo exists, report PR blocked and list files changed.

Do not change model/provider/API key behavior, increase third-party costs, deploy production services, or run destructive database operations without explicit user confirmation.
```


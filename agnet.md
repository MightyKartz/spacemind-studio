# agnet.md

This file exists as a typo-compatible pointer for people or agents who type
`agnet.md` instead of `AGENTS.md`.

Use the canonical project instruction file first:

```text
AGENTS.md
```

Then use these execution helpers:

```text
TASK_BOARD.md
MULTI_AGENT_IMPLEMENTATION_PLAN.md
docs/multi-agent-goal-runbook.md
GOAL_PROMPT.md
```

## Goal Command Quick Start

In Codex, start a goal run and paste the prompt from `GOAL_PROMPT.md`:

```text
/goal
```

The goal runner should:

1. read `AGENTS.md` and the task board;
2. select the first unchecked task in the first `Active` phase;
3. write a short stage card before edits;
4. use the relevant role files in `.codex/agents/`;
5. verify before marking a task complete;
6. update `TASK_BOARD.md` only after verification passes;
7. create a branch, commit, push, and open a draft PR when GitHub access is available.

If GitHub authentication, push permission, Windows/Revit, or paid model/provider
access is missing, record the blocker instead of pretending the step succeeded.

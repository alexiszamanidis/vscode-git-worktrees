# AGENTS.md — VS Code Git Worktrees

> Guidance for AI coding agents working in this repository.

## Project Overview

**VS Code Git Worktrees** is a VS Code extension that wraps Git worktree operations with an interactive UI, letting developers add, list/switch, and remove worktrees without leaving the editor. TypeScript, targets VS Code `^1.65.0`, requires Git `≥ 2.34.1`.

---

## Essential Commands

```bash
# Compile once
yarn compile

# Compile in watch mode (default build task)
yarn watch

# Type-check without emitting
yarn typescript

# Lint
yarn lint

# Lint with auto-fix
yarn lint:fix

# Format all files
yarn format

# Run Jest unit tests (watch mode)
yarn jest-test

# Run Mocha integration tests (compiles first)
yarn test

# Publish to VS Code Marketplace
yarn publish
```

> **Before submitting a PR**: run `yarn typescript && yarn lint && yarn jest-test --watchAll=false`.

---

## Architecture

The extension registers four VS Code commands at activation time (`src/extension.ts`). Each command delegates to a dedicated operation module under `src/git/operations/worktree/`. Those modules orchestrate calls to the helper layer, which encapsulates all Git CLI execution, VS Code UI interactions, and string utilities.

```
src/extension.ts          ← activation + command registration
src/constants/            ← shared string constants and URLs
src/git/operations/worktree/
  gitWorktreeAdd.ts       ← "add" workflow (fetch → select branch → create)
  gitWorktreeList.ts      ← "list/switch" workflow
  gitWorktreeRemove.ts    ← "remove" workflow
src/helpers/
  gitHelpers.ts           ← Git CLI wrappers (fetch, branch ops, repo checks)
  gitWorktreeHelpers.ts   ← Worktree-specific Git commands + VS Code window ops
  helpers.ts              ← Shell execution (exec/spawn), file copy, settings reads
  vsCodeHelpers.ts        ← VS Code UI helpers (QuickPick, InputBox, messages)
  stringHelpers.ts        ← Pure string utilities
  logger.ts               ← Toggleable output-channel logger
```

---

## Code Conventions

-   **TypeScript strict mode** is enabled (`"strict": true` in `tsconfig.json`).
-   **Module system**: CommonJS (`"module": "commonjs"`), target ES2020.
-   All source lives under `src/`; compiled output goes to `out/` (gitignored).
-   Git CLI is invoked via `executeCommand` (uses `child_process.exec`) or `spawnCommand` (uses `child_process.spawn` for streaming). Both are in `src/helpers/helpers.ts`.
-   VS Code UI calls are centralised in `src/helpers/vsCodeHelpers.ts` — do not call `vscode.window.*` directly from operation modules.
-   All user-facing strings and URLs are constants in `src/constants/constants.ts`.
-   Use the `logger` helper (not `console.log`) for any diagnostic output; it writes to a VS Code output channel and is toggled by the `toggleLogs` command.
-   Pre-commit hook runs `lint-staged` (ESLint + Prettier on staged files) via Husky v4.

---

## Testing

| Suite       | Runner                          | Location                | Purpose                                         |
| ----------- | ------------------------------- | ----------------------- | ----------------------------------------------- |
| Unit        | Jest + `ts-jest`                | `src/helpers/*.test.ts` | Pure helper functions (string ops, git helpers) |
| Integration | Mocha + `@vscode/test-electron` | `src/test/`             | VS Code extension host tests                    |

VS Code API is mocked via `__mocks__/vscode.js`. Jest config is in `jest.config.js`.

---

## Boundaries & Constraints

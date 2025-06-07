# [2.4.0](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.3.0...v2.4.0) (2025-06-07)


### Features

* **color:** add worktree coloring ([a03c890](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/a03c8903e0aac39860a3953ba48f2bb316c3dd0d))

# [2.3.0](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.2.0...v2.3.0) (2025-06-07)

### Features

-   **copy-files:** add copy-files when creating a worktree ([40ddc41](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/40ddc41a800f070594bd2f438e4ea071417dd7fc))

# [2.2.0](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.1.4...v2.2.0) (2023-09-09)

### Features

-   **auto-pull:** add auto-pull option ([d22f5be](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/d22f5be25ae8f786619fa21f9e81e69f82e157e9))
-   **auto-push:** add auto-push option ([cd3bd22](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/cd3bd22a7fdee2de420fed2986d874a9700dc45a))

## [2.1.4](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.1.3...v2.1.4) (2023-08-29)

### Bug Fixes

-   **copy-to-clipboard:** refactor clipboard function and use vscode API ([9bbce6a](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/9bbce6ab27d3f7983dd16e50b4a9e606cde2cc22))

## [2.1.3](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.1.2...v2.1.3) (2023-06-22)

### Bug Fixes

-   **release:** add extension publish task in release.yml file ([c019a55](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/c019a552ae88d6c5df19933b53e9fe997c942ea8))

## [2.1.2](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.1.1...v2.1.2) (2023-06-22)

### Bug Fixes

-   **ci:** run linting in ci.yml ([084efda](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/084efda44bba04d3b66aed414700088b0c4333e9))

## [2.1.1](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.1.0...v2.1.1) (2023-06-18)

### Bug Fixes

-   **ci:** run ci.yml on every commit ([8341ca7](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/8341ca72418d9f0fd9e25e087c24bc6a3960445e))

# [2.1.0](https://github.com/alexiszamanidis/vscode-git-worktrees/compare/v2.0.5...v2.1.0) (2023-06-18)

### Features

-   **ci:** add ci.yml ([00823b3](https://github.com/alexiszamanidis/vscode-git-worktrees/commit/00823b3f6cc1d6e029a543e49f6ee591c8309b8e))

# Change Log

All notable changes to the "git-worktrees" extension will be documented in this file.

## [2.0.5] - 2023-05-07

### Fixed

-   Bugfix: Path with spaces for all environments

## [2.0.4] - 2023-04-29

### Fixed

-   Bugfix: Path with spaces

## [2.0.1] - 2023-03-11

### Added

-   Add multiple-workspaces handling

## [1.0.24] - 2022-12-12

### Added

-   Add remote branch input validation

## [1.0.23] - 2022-12-10

### Added

-   Prevent collisions

## [1.0.22] - 2022-10-30

### Updated

-   Update `README.md` and `CREDITS.md`

## [1.0.21] - 2022-10-30

### Added

-   Add `vsCodeGitWorktrees.worktrees.dir.path` property
-   Change `git worktree add` operation flow

## [1.0.20] - 2022-10-02

### Added

-   Add workspace handling when switching between worktrees

## [1.0.19] - 2022-09-26

### Updated

-   Enhance path calculation method to calculate the path based on the common git directory

## [1.0.18] - 2022-09-26

### Added

-   Information message when a new working tree is created

### Updated

-   vsCodeGitWorktrees.move.openNewVscodeWindow default value

## [1.0.17] - 2022-09-23

### Added

-   Commands logging

### Updated

-   Replace all exec command with executeCommand

## [1.0.16] - 2022-09-22

### Updated

-   Enhance new worktree path calculation
    -   Calculate the path based on the top level git directory

### Added

-   Add `vsCodeGitWorktrees.move.openNewVscodeWindow` property

## [1.0.11] - 2022-07-02

### Added

-   Add force remove for untracked or modified files

## [1.0.10] - 2022-06-05

### Added

-   Add jest package

### Fixed

-   Fix git worktree operation

## [1.0.8] - 2022-05-31

### Added

-   Add `vsCodeGitWorktrees.remove.stalledBranches` property

## [1.0.8] - 2022-05-28

### Added

-   Instructions for running the extension locally

## [1.0.7] - 2022-05-26

### Enhancement

-   Windows support

## [1.0.5] - 2022-05-01

### Updated

-   Handle of no remote branch selection in Git Worktree Add operation

## [1.0.4] - 2022-05-01

### Fixed

-   Bare repository fetch setup

## [1.0.3] - 2022-05-01

### Added

-   Git Worktree Add: Add(Handle) remote branch

## [1.0.2] - 2022-05-01

### Updated

-   Notification Message

## [1.0.1] - 2022-04-30

### Added

-   Feature: Git Worktree Add

## [0.0.11] - 2022-04-02

### Reverted

-   Revert Git Worktree redirection when a working worktree gets deleted

## [0.0.10] - 2022-04-02

### Added

-   Add Git Worktree redirection when a working worktree gets deleted

## [0.0.9] - 2022-03-26

### Added

-   Add Git Worktree Remove Gif

### Updated

-   Update Error Gif

## [0.0.8] - 2022-03-15

### Added

-   Add Git Worktree Remove operation

### Updated

-   Update Error Pop up

## [0.0.7] - 2022-03-08

### Updated

-   Update README.md
-   Description in package.json

## [0.0.6] - 2022-03-08

### Updated

-   Description in package.json

## [0.0.5] - 2022-03-08

### Added

-   Replace Logo
-   Add TODO.md

## [0.0.4] - 2022-03-08

### Added

-   Logo

## [0.0.3] - 2022-03-08

### Added

-   Changelog
-   Git Worktree List Types
-   Demo Gifs

## [0.0.2] - 2022-03-07

### Added

-   VS Code Informational/Error messages

## [0.0.1] - 2022-03-06

### Added

-   Git Worktree list

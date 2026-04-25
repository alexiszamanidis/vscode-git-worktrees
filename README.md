# 🧩 VS Code Git Worktrees

A **wrapper for Git Worktree operations** that provides an **interactive API** so developers can manage worktrees more easily — without switching between the terminal and VS Code.

## 🎯 Purpose of the Extension

After creating a [ZSH plugin for Git operations](https://github.com/alexiszamanidis/zsh-git-fzf), I noticed how often I switched between the terminal and my main editor (VS Code). To streamline my workflow, I built this extension to **keep everything inside VS Code**.

## ⚙️ Requirements

-   **Git ≥ 2.34.1**

## 🧪 Multiple Workspaces Support

This extension supports **multiple workspaces**. Here's how it works:

-   If you have more than one project open, you'll be prompted to choose the workspace to run the operation in.
-   If only one project is open, it is automatically selected.

✅ Select a workspace from the list → the operation will run in that workspace.

## 🛠️ Supported Operations

### ➕ `git worktree add [remote-branch] [new-branch]`

Create a new worktree.

**Behavior:**

-   If you skip the new branch name (`ESC`), it defaults to using the same name as the remote branch.
-   Since worktree and branch names are often identical, the extension validates user input accordingly.
    👉 [See Issue #22](https://github.com/alexiszamanidis/vscode-git-worktrees/issues/22)

### 📄 `git worktree list`

Display all worktrees and **switch between them easily** via an interactive UI.

### ❌ `git worktree remove [worktree-name]`

Remove an existing worktree.

**Behavior:**

-   If untracked or modified files exist, a ⚠️ **popup will appear** in the bottom right.
-   You can **force delete** by clicking the `Force delete` button in that popup.

**Restrictions:**

-   You **cannot delete** the worktree you're currently working in.

## 🚀 Getting Started

1. 📦 Install the [Git Worktrees](https://marketplace.visualstudio.com/items?itemName=GitWorktrees.git-worktrees) extension from the VS Code Marketplace.
2. 💡 Open the command palette: `Ctrl + Shift + P`
3. 🔍 Search for any available operations
    > All commands are prefixed with: `Git Worktree: `

## ✨ Features & Operations

### ➕ Worktree Add (Create)

Create a new Git worktree with an intuitive interface.

![worktree-add](https://user-images.githubusercontent.com/48658768/166140848-f58e7cd6-17c1-4ed6-a29f-2295518b39da.gif)

### 🔁 Worktree List (Switch)

View and switch between all active worktrees with ease.

![worktree-list](https://user-images.githubusercontent.com/48658768/157105330-6db6ecae-75b4-4b0b-9fe8-4762ef389931.gif)

### ❌ Worktree Remove

Safely remove a worktree. If files are untracked or modified, you’ll get a prompt to confirm.

![worktree-remove](https://user-images.githubusercontent.com/48658768/160238740-e9e5dc1a-4c45-4d66-a6c1-4a8ae73d412d.gif)

### ⚠️ Error Handling

If something goes wrong, a helpful popup will appear at the bottom-right corner of your screen.
Please don’t hesitate to [open an issue](https://github.com/alexiszamanidis/vscode-git-worktrees/issues) if you encounter a bug.

![error](https://user-images.githubusercontent.com/48658768/160239217-c915cf20-9e03-49cb-be3b-9a4b691cf189.gif)

## ⚙️ Extension Settings

Customize behavior using the following properties in your VS Code settings:

| 🏷️ Property                                      | 🧩 Type   | 🛠️ Default | 📃 Description                                                                                                                                               |
| ------------------------------------------------ | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vsCodeGitWorktrees.remove.stalledBranches`      | `boolean` | `false`    | Remove local (stalled) branches that no longer exist on the remote                                                                                           |
| `vsCodeGitWorktrees.move.openNewVscodeWindow`    | `boolean` | `true`     | Open a new VS Code window when switching or creating a worktree                                                                                              |
| `vsCodeGitWorktrees.worktrees.dir.path`          | `string`  | `null`     | Define a directory for storing all your worktrees, e.g. `${userHome}/worktrees` or `/home/user/worktrees`                                                    |
| `vsCodeGitWorktrees.add.autoPush`                | `boolean` | `true`     | Automatically push the new worktree branch after creation                                                                                                    |
| `vsCodeGitWorktrees.add.autoPull`                | `boolean` | `true`     | Automatically pull updates after creating a new worktree branch                                                                                              |
| `vsCodeGitWorktrees.worktreeCopyIncludePatterns` | `array`   | `[]`       | Files and folders to copy from the source repo to the new worktree, e.g. `[".venv", "docs/tmp"]`                                                             |
| `vsCodeGitWorktrees.worktreeCopyExcludePatterns` | `array`   | `[]`       | Files and folders to **exclude** from the worktree copy, e.g. `["tmp", "target"]`                                                                            |
| `vsCodeGitWorktrees.worktree.coloring`           | `boolean` | `false`    | Enable color labels when creating or switching worktrees                                                                                                     |
| `vsCodeGitWorktrees.worktreeSearchPath`          | `string`  | `null`     | Optional subdirectory (relative or absolute) where Git repositories can be found if the root workspace is not a Git repository, e.g. `${userHome}/worktrees` |

## Contributing

We welcome all contributions, issues and feature requests, whether small or large. If you want to contribute, feel free to check out our [issues page](https://github.com/alexiszamanidis/vscode-git-worktrees/issues) and our [guidelines](https://github.com/alexiszamanidis/vscode-git-worktrees/blob/master/CONTRIBUTING.md).

## Contributors

<a href="https://github.com/alexiszamanidis/vscode-git-worktrees/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=alexiszamanidis/vscode-git-worktrees" />
</a>

## License

[MIT © Alexis Zamanidis](https://github.com/alexiszamanidis/vscode-git-worktrees/blob/master/LICENSE)

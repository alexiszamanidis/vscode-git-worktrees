# Git Worktrees

A Wrapper for Git Worktree Operations that provides an interactive API so developers can have a better experience.

### Purpose of the extension

After creating a ZSH plugin that was responsible for wrapping up my daily git operations([zsh-git-fzf](https://github.com/alexiszamanidis/zsh-git-fzf)), I found myself very often switching between the terminal and my main Editor(VS Code). So I decided to create an extension for my main Editor that would help me avoid switching between them and keep everything in one tool.

### Requirements

-   Git version: 2.34.1

### Supported operations

-   `git worktree add [new-branch] [remote-branch]`

    Create a new worktree

    **Behavior**

    -   If you do not select a remote branch(`ESC`), you will create a new worktree with the new branch you typed. This was made for convenience, instead of having `git worktree add master master`, you can just run `git worktree add master`.

-   `git worktree list`

    Display all worktrees and switch between them

-   `git worktree remove [worktree-name]`

    Remove a worktree

    **Restrictions**

    -   You cannot delete the same Worktree as the one you are currently working on

### Getting started

**Steps:**

-   Install [Git Worktree](https://marketplace.visualstudio.com/items?itemName=GitWorktrees.git-worktrees) VS Code extension
-   Open the palette: `CTRL + SHIFT + P`
-   Search for any available operations
    -   Prefix: `Git Worktree: `

### Features/Operations/Error

-   **Worktree Add (Create)**

![worktree-add](https://user-images.githubusercontent.com/48658768/166122708-e09b1f00-1797-4297-b7c5-6e624f7d4c64.gif)

-   **Worktree List (Switch)**

![worktree-list](https://user-images.githubusercontent.com/48658768/157105330-6db6ecae-75b4-4b0b-9fe8-4762ef389931.gif)

-   **Worktree Remove**

![Worktree remove](https://user-images.githubusercontent.com/48658768/160238740-e9e5dc1a-4c45-4d66-a6c1-4a8ae73d412d.gif)

-   **Error**

    If anything goes wrong a Popup will be shown at the bottom left of the screen

    If you see anything weird, please open an [issue](https://github.com/alexiszamanidis/vscode-git-worktrees/issues)

![error](https://user-images.githubusercontent.com/48658768/160239217-c915cf20-9e03-49cb-be3b-9a4b691cf189.gif)

## Contribution

-   Reporting a bug
-   Improving this documentation
-   Writing tests
-   Sharing this project and recommending it to your friends
-   Giving a star on this repository

## License

[MIT © Alexis Zamanidis](https://github.com/alexiszamanidis/vscode-git-worktrees/blob/master/LICENSE)

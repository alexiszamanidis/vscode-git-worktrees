# Git Worktrees

A Wrapper for Git Worktree Operations that provides an interactive API so developers have a better experience.

### Purpose of the extension

After creating a ZSH plugin that was responsible for wrapping up my daily git operations([zsh-git-fzf](https://github.com/alexiszamanidis/zsh-git-fzf)), I found myself very often switching between the terminal and my main Editor(VS Code). So I decided to create an extension for my main Editor that would help me avoid switching between them and keep everything in one tool.

### Supported operations

-   `git worktree list`

    Display all worktrees and switch between them

### Getting started

**Steps:**

-   Install [Git Worktree](https://marketplace.visualstudio.com/items?itemName=GitWorktrees.git-worktrees) VS Code extension
-   Open the palette: `CTRL + SHIFT + P`
-   Search for any avaiable operations
    -   Prefix: `Git Worktree: `

### Features/Operations

-   **Worktree List (Switch)**

![worktree-list](https://user-images.githubusercontent.com/48658768/157105330-6db6ecae-75b4-4b0b-9fe8-4762ef389931.gif)

-   **Error**

    If anything goes wrong a Popup will be shown at the bottom left of the screen

    If you see anything weird, please open an [issue](https://github.com/alexiszamanidis/vscode-git-worktrees/issues)

![error](https://user-images.githubusercontent.com/48658768/157106534-1b350ce4-426c-4fdc-9001-a2d2841d92be.gif)

## Contribution

-   Reporting a bug
-   Improving this documentation
-   Writing tests
-   Sharing this project and recommending it to your friends
-   Giving a star on this repository

## License

[MIT © Alexis Zamanidis](https://github.com/alexiszamanidis/vscode-git-worktrees/blob/master/LICENSE)

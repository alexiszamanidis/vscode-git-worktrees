# VS Code Git Worktrees

A Wrapper for Git Worktree Operations that provides an interactive API so developers can have a better experience.

### Purpose of the extension

After creating a ZSH plugin that was responsible for wrapping up my daily git operations([zsh-git-fzf](https://github.com/alexiszamanidis/zsh-git-fzf)), I found myself very often switching between the terminal and my main Editor(VS Code). So I decided to create an extension for my main Editor that would help me avoid switching between them and keep everything in one tool.

### Requirements

-   Git version >= 2.34.1

### Multiple Workspaces

This project supports multiple workspaces, allowing users to organize and manage their projects in separate spaces. If you have opened more than one project, you will be asked to select the workspace in which you want to run the operation. If you have only one project opened, it will be selected as the default workspace.

To select a workspace, simply choose from the list of available workspaces when prompted. Once you've made your selection, the operation will be executed within the chosen workspace.

### Supported operations

-   `git worktree add [remote-branch] [new-branch]`

    Create a new worktree

    **Behavior**

    -   If you do not select a new branch(`ESC`), you will create a new worktree with the remote branch you typed. This was made for convenience, instead of having `git worktree add master master`, you can just run `git worktree add master`.

    -   Since the name of the worktree and branch is the same, we validate the user's new-branch input(Relevant [issue](https://github.com/alexiszamanidis/vscode-git-worktrees/issues/22))

-   `git worktree list`

    Display all worktrees and switch between them

-   `git worktree remove [worktree-name]`

    Remove a worktree

    **Behavior**

    -   If you have untracked or modified files a Popup will be shown at the bottom left of the screen.
        -   If you want to force delete the worktree with the untracked or modified files, just click `Force delete` on the Popup

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

![worktree-add](https://user-images.githubusercontent.com/48658768/166140848-f58e7cd6-17c1-4ed6-a29f-2295518b39da.gif)

-   **Worktree List (Switch)**

![worktree-list](https://user-images.githubusercontent.com/48658768/157105330-6db6ecae-75b4-4b0b-9fe8-4762ef389931.gif)

-   **Worktree Remove**

![Worktree remove](https://user-images.githubusercontent.com/48658768/160238740-e9e5dc1a-4c45-4d66-a6c1-4a8ae73d412d.gif)

-   **Error**

    If anything goes wrong a Popup will be shown at the bottom left of the screen

    If you see anything weird, please open an [issue](https://github.com/alexiszamanidis/vscode-git-worktrees/issues)

![error](https://user-images.githubusercontent.com/48658768/160239217-c915cf20-9e03-49cb-be3b-9a4b691cf189.gif)

## Properties

| Property                                       | Type    | Default value | Description                                                                                        |
| ---------------------------------------------- | ------- | ------------- | -------------------------------------------------------------------------------------------------- |
| vsCodeGitWorktrees.remove.stalledBranches      | boolean | false         | Removes local(stalled) branches that do not exist on remote                                        |
| vsCodeGitWorktrees.move.openNewVscodeWindow    | boolean | true          | Open new vscode window when you switch or create a worktree                                        |
| vsCodeGitWorktrees.worktrees.dir.path          | string  | null          | Define a directory for all worktrees between your projects                                         |
| vsCodeGitWorktrees.add.autoPush                | boolean | true          | Auto push worktree branch after its creation                                                       |
| vsCodeGitWorktrees.add.autoPull                | boolean | true          | Auto pull worktree branch after its creation                                                       |
| vsCodeGitWorktrees.worktreeCopyIncludePatterns | array   | []            | Patterns specifying which files and folders to copy from the source repository to the new worktree |
| vsCodeGitWorktrees.worktreeCopyExcludePatterns | array   | []            | Patterns specifying files and folders to exclude from copying when creating a new worktree         |
| vsCodeGitWorktrees.worktree.coloring           | boolean | false         | Enable worktree coloring when creating or switching worktree                                       |

## 💡 How You Can Contribute

Whether it’s your first time contributing or you're a seasoned open-source developer, you're welcome here! Here are some great ways to get involved:

-   🐛 **Report a Bug** – Found something odd? [Open an issue](https://github.com/alexiszamanidis/vscode-git-worktrees/issues) and let us know.
-   📚 **Improve the Documentation** – Typos, clarity, or better examples? We’d love your help!
-   ✅ **Write Tests** – Help us make sure everything works smoothly.
-   📢 **Share the Project** – Tell your friends or tweet about it!
-   ⭐️ **Star the Repository** – A small gesture that means a lot.
-   📋 **Check Out the [TODO List](https://github.com/alexiszamanidis/vscode-git-worktrees/blob/master/TODO.md)** – Grab a task and dive in!

## 🚀 Want to Contribute Code?

Awesome! Here’s a quick guide to get started:

1. **Fork the Project**
   Click the _Fork_ button at the top right of the repository.
2. **Clone Your Fork**

```bash
git clone https://github.com/your-username/vscode-git-worktrees.git
cd vscode-git-worktrees
```

3. **Make Your Changes**
   Work your magic — whether it’s a new feature, a fix, or docs improvement.
4. **Open a Pull Request**
   Go to the original repository and click Compare & pull request. Add a helpful description and submit!

### 🛠️ Run the Extension Locally

Want to test or develop the extension on your machine? Here’s how:

```bash
# Install dependencies
yarn

# Compile the code and watch for changes
yarn watch
```

Then, open the project in Visual Studio Code, press F5, and it will launch in a new Extension Development Host window.

## License

[MIT © Alexis Zamanidis](https://github.com/alexiszamanidis/vscode-git-worktrees/blob/master/LICENSE)

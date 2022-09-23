## Publish-Version Script

-   Calculate new version
-   Check CHANGELOG.md if it contains details about new version
-   Publish new version

## Worktree Remove Redirection

-   This is implemented and commented out. Let's revisit it on phase 2
-   If the worktree you want to delete is the same as the one you are currently working on, then you will be moved to another directory:
    -   If there are no other worktrees, you will be moved to the parent directory
    -   Otherwise, it will search for **main worktrees** like: `["master", "main", "develop", "dev", "release"]`, so you can be moved to them.
        -   If it **doesn't find any main worktree**, you will be moved to the first directory selected by `git worktree list`

## Replace all exec commands with executeCommand function

## Add better GIFs(Replace already existing GIFs)

## Add tests

## Add typescript path aliases

## Is there a way to implement the on_worktree_change feature?

Refs:

-   [zsh_git_fzf_on_worktree_operation](https://github.com/alexiszamanidis/zsh-git-fzf#hooks)

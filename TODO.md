## Worktree Remove Redirection

-   This is implemented and commented out. Let's revisit it on phase 2
-   If the worktree you want to delete is the same as the one you are currently working on, then you will be moved to another directory:
    -   If there are no other worktrees, you will be moved to the parent directory
    -   Otherwise, it will search for **main worktrees** like: `["master", "main", "develop", "dev", "release"]`, so you can be moved to them.
        -   If it **doesn't find any main worktree**, you will be moved to the first directory selected by `git worktree list`

## Add better GIFs(Replace already existing GIFs)

## Add tests

## Add typescript path aliases

## Check the Git version and log the corresponding message

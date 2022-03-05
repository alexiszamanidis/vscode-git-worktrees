import * as vscode from "vscode";
import gitWorktreeList from "./operations/worktree/list";

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand("git-worktrees.worktree.list", async () => {
        await gitWorktreeList();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

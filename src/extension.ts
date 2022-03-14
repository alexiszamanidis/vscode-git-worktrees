import * as vscode from "vscode";
import gitWorktreeList from "./git/operations/worktree/gitWorktreeList";
import gitWorktreeRemove from "./git/operations/worktree/gitWorktreeRemove";

export function activate(context: vscode.ExtensionContext) {
    let gitWtList = vscode.commands.registerCommand("git-worktrees.worktree.list", async () => {
        await gitWorktreeList();
    });

    let gitWtRemove = vscode.commands.registerCommand("git-worktrees.worktree.remove", async () => {
        await gitWorktreeRemove();
    });

    context.subscriptions.push(gitWtList);
    context.subscriptions.push(gitWtRemove);
}

export function deactivate() {}

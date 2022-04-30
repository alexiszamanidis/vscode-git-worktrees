import * as vscode from "vscode";
import gitWorktreeList from "./git/operations/worktree/gitWorktreeList";
import gitWorktreeRemove from "./git/operations/worktree/gitWorktreeRemove";
import gitWorktreeAdd from "./git/operations/worktree/gitWorktreeAdd";
import { showWhatsNew } from "./helpers/helpers";

export function activate(context: vscode.ExtensionContext) {
    let gitWtList = vscode.commands.registerCommand("git-worktrees.worktree.list", async () => {
        await gitWorktreeList();
    });

    let gitWtRemove = vscode.commands.registerCommand("git-worktrees.worktree.remove", async () => {
        await gitWorktreeRemove();
    });

    let gitWtAdd = vscode.commands.registerCommand("git-worktrees.worktree.add", async () => {
        await gitWorktreeAdd();
    });

    context.subscriptions.push(gitWtList);
    context.subscriptions.push(gitWtRemove);
    context.subscriptions.push(gitWtAdd);

    showWhatsNew(context);
}

export function deactivate() {}

import * as vscode from "vscode";
import gitWorktreeList from "./git/operations/worktree/gitWorktreeList";
import gitWorktreeRemove from "./git/operations/worktree/gitWorktreeRemove";
import gitWorktreeAdd from "./git/operations/worktree/gitWorktreeAdd";
import { showWhatsNew } from "./helpers/helpers";
import logger from "./helpers/logger";

export function activate(context: vscode.ExtensionContext) {
    const gitWtList = vscode.commands.registerCommand("git-worktrees.worktree.list", async () => {
        await gitWorktreeList();
    });

    const gitWtRemove = vscode.commands.registerCommand(
        "git-worktrees.worktree.remove",
        async () => {
            await gitWorktreeRemove();
        }
    );

    const gitWtAdd = vscode.commands.registerCommand("git-worktrees.worktree.add", async () => {
        await gitWorktreeAdd();
    });
    const toggleLogs = vscode.commands.registerCommand("git-worktrees.worktree.toggleLogs", () => {
        logger.toggle();
    });

    context.subscriptions.push(gitWtList);
    context.subscriptions.push(gitWtRemove);
    context.subscriptions.push(gitWtAdd);
    context.subscriptions.push(toggleLogs, logger);

    showWhatsNew(context);
}

export function deactivate() {}

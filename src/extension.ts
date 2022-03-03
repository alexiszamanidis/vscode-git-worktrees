import * as vscode from "vscode";
// import * as cp from "child_process";

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand("git-worktrees.worktree.list", () => {
        vscode.window.showInformationMessage("Hello World from Git Worktrees!");
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

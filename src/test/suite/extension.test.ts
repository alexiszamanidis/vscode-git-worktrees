import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
    test("extension activates and registers worktree commands", async () => {
        const extension = vscode.extensions.getExtension("GitWorktrees.git-worktrees");
        assert.ok(extension, "Git Worktrees extension should be installed in the test host");

        await extension!.activate();
        assert.strictEqual(extension!.isActive, true);

        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes("git-worktrees.worktree.list"));
        assert.ok(commands.includes("git-worktrees.worktree.remove"));
        assert.ok(commands.includes("git-worktrees.worktree.add"));
        assert.ok(commands.includes("git-worktrees.worktree.toggleLogs"));
    });
});

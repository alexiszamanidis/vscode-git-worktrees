import * as vscode from "vscode";
import { removeFirstAndLastCharacter } from "../../../helpers/stringHelpers";
import { showErrorMessage } from "../../../helpers/vsCodeHelpers";
import * as util from "util";

const exec = util.promisify(require("child_process").exec);

const formatWorktrees = (
    splitWorktrees: Array<[string, string, string]>
): Array<{ path: string; hash: string; worktree: string }> =>
    splitWorktrees.map((worktree) => ({
        path: worktree[0],
        hash: worktree[1],
        worktree: removeFirstAndLastCharacter(worktree[2]),
    }));

const getWorktreesList = (
    stdout: string
): Array<{ path: string; hash: string; worktree: string }> => {
    let splitWorktrees: Array<[string, string, string]> = [];

    stdout.split("\n").forEach((worktree: string) => {
        // worktree: path-hash-worktree
        // ignore: spaces
        const filteredWt = worktree.split(" ").filter((str: string) => str !== "");
        // ignore: path-(bare)
        if (filteredWt.length === 3) {
            splitWorktrees.push(filteredWt as any);
        }
    });

    return formatWorktrees(splitWorktrees);
};

const selectWorktree = async (worktrees: any[]) =>
    await vscode.window.showQuickPick(
        worktrees.map((wt: any) => ({ label: wt.worktree, detail: wt.path })),
        {
            matchOnDetail: true,
        }
    );

const moveIntoWorktree = async (worktree: any) =>
    vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file((worktree as any).detail), {
        forceNewWindow: false,
    });

const gitWorktreeList = async () => {
    const command = "git worktree list";
    const options = {
        cwd: vscode.workspace.rootPath,
    };

    try {
        const { stdout } = await exec(command, options);

        const worktrees = await getWorktreesList(stdout);

        const worktree = await selectWorktree(worktrees);

        // eslint-disable-next-line curly
        if (!worktree) return;

        await moveIntoWorktree(worktree);
    } catch (e: any) {
        await showErrorMessage(e.message);
    }
};

export default gitWorktreeList;

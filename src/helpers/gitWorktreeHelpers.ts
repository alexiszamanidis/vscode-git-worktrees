import * as util from "util";
import * as vscode from "vscode";
import { getCurrentPath } from "./helpers";
import { removeFirstAndLastCharacter } from "../helpers/stringHelpers";

const exec = util.promisify(require("child_process").exec);

type FilteredWorktree = [string, string, string];
type Worktree = { path: string; hash: string; worktree: string };
type WorktreeList = Array<Worktree>;
type SelectedWorktree = { label: string; detail: string };

export const selectWorktree = async (
    worktrees: WorktreeList
): Promise<SelectedWorktree | undefined> =>
    await vscode.window.showQuickPick(
        worktrees.map((wt) => ({ label: wt.worktree, detail: wt.path })),
        {
            matchOnDetail: true,
        }
    );

export const moveIntoWorktree = async (worktree: SelectedWorktree): Promise<void> =>
    await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(worktree.detail), {
        forceNewWindow: false,
    });

const formatWorktrees = (splitWorktrees: Array<FilteredWorktree>): WorktreeList =>
    splitWorktrees.map((worktree) => ({
        path: worktree[0],
        hash: worktree[1],
        worktree: removeFirstAndLastCharacter(worktree[2]),
    }));

const getWorktreesList = (stdout: string): WorktreeList => {
    let splitWorktrees: Array<FilteredWorktree> = [];

    stdout.split("\n").forEach((worktree: string) => {
        // worktree: path-hash-worktree
        // ignore: spaces
        const filteredWt = worktree.split(" ").filter((str: string) => str !== "");
        // ignore: path-(bare)
        if (filteredWt.length === 3) {
            splitWorktrees.push(filteredWt as FilteredWorktree);
        }
    });

    return formatWorktrees(splitWorktrees);
};

export const getWorktrees = async () => {
    const command = "git worktree list";
    const options = {
        cwd: await getCurrentPath(),
    };

    try {
        const { stdout } = await exec(command, options);

        const worktrees = await getWorktreesList(stdout);

        return worktrees;
    } catch (e: any) {
        throw Error(e);
    }
};

export const pruneWorktrees = async () => {
    const command = "git worktree prune";
    const options = {
        cwd: await getCurrentPath(),
    };

    try {
        await exec(command, options);
    } catch (e: any) {
        throw Error(e);
    }
};

export const removeWorktree = async (worktree: SelectedWorktree) => {
    const currentPath = await getCurrentPath();
    const isSamePath = currentPath === worktree.detail;
    const command = `git worktree remove ${worktree.label}`;
    const options = {
        cwd: currentPath,
    };

    try {
        const { stdout } = await exec(command, options);
    } catch (e: any) {
        throw Error(e);
    }
};

import * as util from "util";
import * as vscode from "vscode";
import { executeCommand, getCurrentPath, shouldOpenNewVscodeWindow } from "./helpers";
import { existsRemoteBranch, isBareRepository } from "./gitHelpers";
import { MAIN_WORKTREES } from "../constants/constants";
import { removeFirstAndLastCharacter, removeLastDirectoryInURL } from "../helpers/stringHelpers";
import { showInformationMessage, showInformationMessageWithButton } from "./vsCodeHelpers";

const exec = util.promisify(require("child_process").exec);

type FilteredWorktree = [string, string, string];
type Worktree = { path: string; hash: string; worktree: string };
type WorktreeList = Array<Worktree>;
type SelectedWorktree = { label: string; detail: string };

export const selectWorktree = async (
    worktrees: WorktreeList
): Promise<SelectedWorktree | undefined> =>
    vscode.window.showQuickPick(
        worktrees.map((wt) => ({ label: wt.worktree, detail: wt.path })),
        {
            matchOnDetail: true,
        }
    );

export const moveIntoWorktree = async (worktreePath: string): Promise<void> =>
    vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(worktreePath), {
        forceNewWindow: shouldOpenNewVscodeWindow,
    });

const formatWorktrees = (splitWorktrees: Array<FilteredWorktree>): WorktreeList =>
    splitWorktrees.map((worktree) => ({
        path: worktree[0],
        hash: worktree[1],
        worktree: removeFirstAndLastCharacter(worktree[2]),
    }));

const getWorktreesList = (stdout: string, withBareRepo = false): WorktreeList => {
    let splitWorktrees: Array<FilteredWorktree> = [];

    stdout.split("\n").forEach((worktree: string) => {
        // worktree: path-hash-worktree
        // ignore: spaces
        const filteredWt = worktree.split(" ").filter((str: string) => str !== "");
        // ignore: path-(bare)
        if (filteredWt.length === 3) {
            splitWorktrees.push(filteredWt as FilteredWorktree);
        } else if (withBareRepo && filteredWt.length === 2) {
            const path = filteredWt[0];
            const hash = "";
            const worktree = filteredWt[1];
            splitWorktrees.push([path, hash, worktree] as FilteredWorktree);
        }
    });

    return formatWorktrees(splitWorktrees);
};

export const getWorktrees = async (withBareRepo = false) => {
    const listWorktreesCommand = "git worktree list";

    try {
        const { stdout } = await executeCommand(listWorktreesCommand);

        const worktrees = getWorktreesList(stdout, withBareRepo);

        return worktrees;
    } catch (e: any) {
        throw Error(e);
    }
};

export const pruneWorktrees = async () => {
    const pruneWorktreesCommand = "git worktree prune";

    try {
        await executeCommand(pruneWorktreesCommand);
    } catch (e: any) {
        throw Error(e);
    }
};

const convertWorktreeToSelectedWorktree = (worktree: Worktree): SelectedWorktree => ({
    label: worktree.worktree,
    detail: worktree.path,
});

export const findDefaultWorktreeToMove = async (
    currentWorktree: SelectedWorktree
): Promise<SelectedWorktree> => {
    try {
        const defaultWorktree: SelectedWorktree = {
            label: "",
            detail: removeLastDirectoryInURL(currentWorktree.detail),
        };
        const worktrees = await getWorktrees();

        const filteredWorktrees = worktrees.filter((wt) => wt.worktree !== currentWorktree.label);
        // move to parent directory
        if (filteredWorktrees.length === 0) return defaultWorktree;

        const filteredMainBranches = MAIN_WORKTREES.filter(
            (branch) => branch !== currentWorktree.label
        );
        const defaultWt = filteredWorktrees.find((wt) =>
            filteredMainBranches.includes(wt.worktree)
        );
        if (!defaultWt) return convertWorktreeToSelectedWorktree(filteredWorktrees[0]);

        return convertWorktreeToSelectedWorktree(defaultWt);
    } catch (e: any) {
        throw new Error(e);
    }
};

// TODO: refactor this function
export const removeWorktree = async (worktree: SelectedWorktree) => {
    const currentPath = getCurrentPath();
    const isSamePath = currentPath === worktree.detail;
    const branch = worktree.label;
    const removeWorktreeCommand = `git worktree remove ${branch}`;

    // TODO: something bad happens with paths!!!
    if (isSamePath) {
        throw new Error(
            "You cannot delete the same Worktree as the one you are currently working on"
        );
    }

    try {
        await executeCommand(removeWorktreeCommand);
        await pruneWorktrees();
    } catch (e: any) {
        const errorMessage = e.message;

        // TODDO: add all cases that the user might want to force delete
        const untrackedOrModifiedFilesError = `Command failed: git worktree remove ${branch}\nfatal: '${branch}' contains modified or untracked files, use --force to delete it\n`;

        const isUntrackedOrModifiedFilesError = errorMessage === untrackedOrModifiedFilesError;

        if (!isUntrackedOrModifiedFilesError) throw Error(e);

        const buttonName = "Force Delete";

        const answer = await showInformationMessageWithButton(
            `fatal: '${branch}' contains modified or untracked files, use --force to delete it. Click '${buttonName}' to delete the branch.`,
            buttonName
        );

        if (answer !== buttonName) return;

        const forceCommand = `git worktree remove -f ${branch}`;
        try {
            await executeCommand(forceCommand);

            await pruneWorktrees();
        } catch (err: any) {
            throw Error(err);
        }
    }
};

export const calculateNewWorktreePath = async (branch: string) => {
    const currentPath = getCurrentPath();

    let path = currentPath;

    try {
        const isBareRepo = await isBareRepository();

        if (!isBareRepo) {
            const getTopLevelPathCommand = "git rev-parse --show-toplevel";
            const { stdout: topLevelPath } = await executeCommand(getTopLevelPathCommand);
            path = removeLastDirectoryInURL(topLevelPath as string);
        }

        path = `${path}/${branch}`;

        return path;
    } catch (e: any) {
        throw Error(e);
    }
};

export const existsWorktree = async (worktree: string) => {
    try {
        const worktrees = await getWorktrees();
        const foundWorktree = worktrees.find((wt) => wt.worktree === worktree);
        if (!foundWorktree) return false;
        return true;
    } catch (e: any) {
        throw Error(e);
    }
};

export const addNewWorktree = async (remoteBranch: string, newBranch: string) => {
    const isRemoteBranch = await existsRemoteBranch(newBranch);
    if (isRemoteBranch) throw new Error(`Branch '${newBranch}' already exists.`);

    const newWorktreePath = await calculateNewWorktreePath(newBranch);

    try {
        const worktreeAddCommand = `git worktree add --track -b ${newBranch} ${newWorktreePath} origin/${remoteBranch}`;
        await executeCommand(worktreeAddCommand);

        const pushCommand = `git push --set-upstream origin ${newBranch}`;
        await executeCommand(pushCommand);

        await moveIntoWorktree(newWorktreePath);

        showInformationMessage(
            `Worktree named '${newBranch}' was added successfully. Path: ${newWorktreePath}`
        );
    } catch (e: any) {
        throw Error(e);
    }
};

export const addRemoteWorktree = async (remoteBranch: string, newBranch: string) => {
    const isRemoteBranch = await existsRemoteBranch(remoteBranch);
    if (!isRemoteBranch) throw new Error(`Branch '${newBranch}' does not exist.`);

    const newWorktreePath = await calculateNewWorktreePath(newBranch);

    try {
        const worktreeAddCommand = `git worktree add ${newWorktreePath} ${newBranch}`;
        await executeCommand(worktreeAddCommand);

        const pullCommand = `git -C ${newWorktreePath} pull`;
        await executeCommand(pullCommand);

        await moveIntoWorktree(newWorktreePath);

        showInformationMessage(
            `Worktree named '${newBranch}' was added successfully. Path: ${newWorktreePath}`
        );
    } catch (e: any) {
        throw Error(e);
    }
};

import * as fs from "fs";
import * as vscode from "vscode";
import {
    executeCommand,
    worktreesDirPath,
    getWorkspaceFilePath,
    shouldOpenNewVscodeWindow,
} from "./helpers";
import { existsRemoteBranch, isBareRepository } from "./gitHelpers";
import { MAIN_WORKTREES } from "../constants/constants";
import {
    getFileFromPath,
    removeFirstAndLastCharacter,
    removeLastDirectoryInURL,
    removeNewLine,
} from "../helpers/stringHelpers";
import { showInformationMessage, showInformationMessageWithButton } from "./vsCodeHelpers";

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

export const getGitTopLevel = async (workspaceFolder: string) => {
    try {
        const getGitTopLevelPathCommand = "git rev-parse --show-toplevel";
        const { stdout: getGitTopLevelPath } = await executeCommand(getGitTopLevelPathCommand, {
            cwd: workspaceFolder,
        });
        let topLevelPath = removeNewLine(getGitTopLevelPath);

        return topLevelPath;
    } catch (e: any) {
        throw Error(e);
    }
};

export const openVscodeInstance = async (path: string): Promise<void> =>
    vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(path), {
        forceNewWindow: shouldOpenNewVscodeWindow,
    });

// TODO: refactor this function
export const moveIntoWorktree = async (
    workspaceFolder: string,
    worktreePath: string
): Promise<{ type: string; path: string }> => {
    const workspaceFilePath = getWorkspaceFilePath();
    if (!workspaceFilePath) {
        openVscodeInstance(worktreePath);
        return { type: "folder", path: worktreePath };
    }

    const topLevelPath = await getGitTopLevel(workspaceFolder);
    const basePath = topLevelPath.split("/");
    const workspacePath = workspaceFilePath.path.split("/");

    // remove first element if it is empty
    // eg. path = '/test/path/
    //     pathArray = ['', 'test', 'path']
    //     pathArray = ['test', 'path']
    if (basePath[0] === "") {
        basePath.shift();
    }
    if (workspacePath[0] === "") {
        workspacePath.shift();
    }

    let pathToWorkspace = "";

    for (let i = basePath.length; i < workspacePath.length; i++) {
        pathToWorkspace += "/" + workspacePath[i];
    }

    const fullWorkspacePath = `${worktreePath}${pathToWorkspace}`;

    if (!fs.existsSync(fullWorkspacePath)) {
        openVscodeInstance(worktreePath);
        return { type: "folder", path: worktreePath };
    }

    openVscodeInstance(fullWorkspacePath);
    return { type: "workspace", path: fullWorkspacePath };
};

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

interface GetWorktreesTypes {
    workspaceFolder: string;
    withBareRepo?: boolean;
}

export const getWorktrees = async ({
    workspaceFolder,
    withBareRepo = false,
}: GetWorktreesTypes) => {
    const listWorktreesCommand = "git worktree list";

    try {
        const { stdout } = await executeCommand(listWorktreesCommand, { cwd: workspaceFolder });

        const worktrees = getWorktreesList(stdout, withBareRepo);

        return worktrees;
    } catch (e: any) {
        throw Error(e);
    }
};

export const getWorktree = async (workspaceFolder: string) => {
    const worktrees = await getWorktrees({ workspaceFolder });

    const worktree = await selectWorktree(worktrees);

    return worktree;
};

export const pruneWorktrees = async (workspaceFolder: string) => {
    const pruneWorktreesCommand = "git worktree prune";

    try {
        await executeCommand(pruneWorktreesCommand, { cwd: workspaceFolder });
    } catch (e: any) {
        throw Error(e);
    }
};

const convertWorktreeToSelectedWorktree = (worktree: Worktree): SelectedWorktree => ({
    label: worktree.worktree,
    detail: worktree.path,
});

export const findDefaultWorktreeToMove = async (
    currentWorktree: SelectedWorktree,
    workspaceFolder: string
): Promise<SelectedWorktree> => {
    try {
        const defaultWorktree: SelectedWorktree = {
            label: "",
            detail: removeLastDirectoryInURL(currentWorktree.detail),
        };
        const worktrees = await getWorktrees({ workspaceFolder });

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
export const removeWorktree = async (workspaceFolder: string, worktree: SelectedWorktree) => {
    const isSamePath = workspaceFolder === worktree.detail;
    const branch = worktree.label;
    const removeWorktreeCommand = `git worktree remove ${branch}`;

    // TODO: something bad happens with paths!!!
    if (isSamePath) {
        throw new Error(
            "You cannot delete the same Worktree as the one you are currently working on"
        );
    }

    try {
        await executeCommand(removeWorktreeCommand, { cwd: workspaceFolder });
        await pruneWorktrees(workspaceFolder);
    } catch (e: any) {
        const errorMessage = e.message;

        // TODO: add all cases that the user might want to force delete
        const untrackedOrModifiedFilesError = `Command failed: git worktree remove ${branch}\nfatal: '${branch}' contains modified or untracked files, use --force to delete it\n`;

        const isUntrackedOrModifiedFilesError = errorMessage === untrackedOrModifiedFilesError;

        if (!isUntrackedOrModifiedFilesError) throw Error(e);

        const buttonName = "Force Delete";

        const answer = await showInformationMessageWithButton(
            `fatal: '${branch}' contains modified or untracked files, use --force to delete it. Click '${buttonName}' to delete the branch.`,
            buttonName
        );

        if (answer !== buttonName) return;

        const forceRemoveWorktreeCommand = `git worktree remove -f ${branch}`;
        try {
            await executeCommand(forceRemoveWorktreeCommand, { cwd: workspaceFolder });

            await pruneWorktrees(workspaceFolder);
        } catch (err: any) {
            throw Error(err);
        }
    }
};

const getGitCommonDirPath = async (workspaceFolder: string) => {
    const getGitCommonDirPathCommand = "git rev-parse --path-format=absolute --git-common-dir";

    const { stdout: gitCommonDirPath } = await executeCommand(getGitCommonDirPathCommand, {
        cwd: workspaceFolder,
    });

    return gitCommonDirPath;
};

export const calculateNewWorktreePath = async (workspaceFolder: string, branch: string) => {
    try {
        // If a worktrees path is defined, we need to move the new worktree there
        if (worktreesDirPath) {
            const topLevelPath = await getGitTopLevel(workspaceFolder);
            const repositoryName = await getFileFromPath(topLevelPath);
            const path = `${worktreesDirPath}/${repositoryName}/${branch}`;

            // check if directory exists
            if (fs.existsSync(path)) {
                throw new Error(`Directory '${path}' already exists.`);
            }

            return path;
        }

        const gitCommonDirPath = await getGitCommonDirPath(workspaceFolder);
        let path = removeNewLine(gitCommonDirPath);

        const isBareRepo = await isBareRepository(workspaceFolder, path);

        if (!isBareRepo) {
            // remove .git
            // e.g. /absolute/path/project/.git
            //   -> /absolute/path/project
            path = removeLastDirectoryInURL(path);
            // remove project
            // e.g. /absolute/path/project
            //   -> /absolute/path
            path = removeLastDirectoryInURL(path);
        }

        path = `${path}/${branch}`;

        return path;
    } catch (e: any) {
        throw Error(e);
    }
};

export const existsWorktree = async (workspaceFolder: string, worktree: string) => {
    try {
        const worktrees = await getWorktrees({ workspaceFolder });
        const foundWorktree = worktrees.find((wt) => wt.worktree === worktree);
        if (!foundWorktree) return false;
        return true;
    } catch (e: any) {
        throw Error(e);
    }
};

export const addNewWorktree = async (
    workspaceFolder: string,
    remoteBranch: string,
    newBranch: string
) => {
    const isRemoteBranch = await existsRemoteBranch(workspaceFolder, newBranch);
    if (isRemoteBranch) throw new Error(`Branch '${newBranch}' already exists.`);

    const newWorktreePath = await calculateNewWorktreePath(workspaceFolder, newBranch);

    try {
        const worktreeAddCommand = `git worktree add --track -b ${newBranch} ${newWorktreePath} origin/${remoteBranch}`;
        await executeCommand(worktreeAddCommand, { cwd: workspaceFolder });

        const pushCommand = `git push --set-upstream origin ${newBranch}`;
        await executeCommand(pushCommand, { cwd: workspaceFolder });

        const newWtInfo = await moveIntoWorktree(workspaceFolder, newWorktreePath);

        showInformationMessage(
            `Worktree named '${newBranch}' was added successfully. Type: ${newWtInfo.type}, Path: ${newWtInfo.path}`
        );
    } catch (e: any) {
        throw Error(e);
    }
};

export const addRemoteWorktree = async (
    workspaceFolder: string,
    remoteBranch: string,
    newBranch: string
) => {
    const isRemoteBranch = await existsRemoteBranch(workspaceFolder, remoteBranch);
    if (!isRemoteBranch) throw new Error(`Branch '${newBranch}' does not exist.`);

    const newWorktreePath = await calculateNewWorktreePath(workspaceFolder, newBranch);

    try {
        const worktreeAddCommand = `git worktree add ${newWorktreePath} ${newBranch}`;
        await executeCommand(worktreeAddCommand, { cwd: workspaceFolder });

        const pullCommand = `git -C ${newWorktreePath} pull`;
        await executeCommand(pullCommand, { cwd: workspaceFolder });

        const newWtInfo = await moveIntoWorktree(workspaceFolder, newWorktreePath);

        showInformationMessage(
            `Worktree named '${newBranch}' was added successfully. Type: ${newWtInfo.type}, Path: ${newWtInfo.path}`
        );
    } catch (e: any) {
        throw Error(e);
    }
};

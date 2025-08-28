import * as fs from "fs";
import * as vscode from "vscode";
import {
    executeCommand,
    worktreesDirPath,
    copyWorktreeFiles,
    applyWorktreeColor,
    getWorkspaceFilePath,
    shouldOpenNewVscodeWindow,
    shouldAutoPushAfterWorktreeCreation,
    shouldAutoPullAfterWorktreeCreation,
} from "./helpers";
import logger from "./logger";
import { existsRemoteBranch, isBareRepository, hasSubmodules, pullSubmodules } from "./gitHelpers";
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
    logger.debug(
        `Moving into worktree. workspaceFolder: ${workspaceFolder}, worktreePath: ${worktreePath}`
    );

    const workspaceFilePath = getWorkspaceFilePath();

    if (!workspaceFilePath) {
        logger.debug("No workspace file path found, opening VS Code instance at worktreePath.");
        openVscodeInstance(worktreePath);
        await applyWorktreeColor(worktreePath);
        return { type: "folder", path: worktreePath };
    }

    const topLevelPath = await getGitTopLevel(workspaceFolder);
    logger.debug(`Top level git path: ${topLevelPath}`);

    const basePath = topLevelPath.split("/");
    const workspacePath = workspaceFilePath.path.split("/");

    if (basePath[0] === "") basePath.shift();
    if (workspacePath[0] === "") workspacePath.shift();

    let pathToWorkspace = "";

    for (let i = basePath.length; i < workspacePath.length; i++) {
        pathToWorkspace += "/" + workspacePath[i];
    }

    const fullWorkspacePath = `${worktreePath}${pathToWorkspace}`;
    logger.debug(`Calculated full workspace path: ${fullWorkspacePath}`);

    if (!fs.existsSync(fullWorkspacePath)) {
        logger.warn(
            `Full workspace path does not exist: ${fullWorkspacePath}. Opening worktreePath instead.`
        );
        openVscodeInstance(worktreePath);
        await applyWorktreeColor(worktreePath);
        return { type: "folder", path: worktreePath };
    }

    logger.debug(`Opening VS Code instance at full workspace path: ${fullWorkspacePath}`);
    openVscodeInstance(fullWorkspacePath);
    await applyWorktreeColor(fullWorkspacePath);
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
    logger.debug(`Retrieving worktrees for folder: ${workspaceFolder}`);
    const worktrees = await getWorktrees({ workspaceFolder });

    logger.debug(`Found ${worktrees.length} worktree(s). Prompting user to select one...`);
    const worktree = await selectWorktree(worktrees);

    if (worktree) {
        logger.debug(`User selected worktree: ${worktree.label || worktree.detail || "unknown"}`);
    } else {
        logger.info("No worktree selected by user.");
    }

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
    const worktreePath = worktree.detail;
    const removeWorktreeCommand = `git worktree remove ${worktreePath}`;

    logger.debug(`Attempting to remove worktree '${worktreePath}' in folder: ${workspaceFolder}`);

    if (isSamePath) {
        const errorMsg =
            "You cannot delete the same Worktree as the one you are currently working on";
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        logger.debug(`Running command: ${removeWorktreeCommand}`);
        await executeCommand(removeWorktreeCommand, { cwd: workspaceFolder });
        logger.info(`Successfully removed worktree '${worktreePath}'. Pruning worktrees...`);
        await pruneWorktrees(workspaceFolder);
    } catch (e: any) {
        const errorMessage = e.message;
        logger.warn(`Failed to remove worktree '${worktreePath}': ${errorMessage}`);

        const untrackedOrModifiedFilesError = `Command failed: git worktree remove ${worktreePath}\nfatal: '${worktreePath}' contains modified or untracked files, use --force to delete it\n`;
        const isUntrackedOrModifiedFilesError = errorMessage === untrackedOrModifiedFilesError;

        if (!isUntrackedOrModifiedFilesError) {
            logger.error(
                `Unexpected error when removing worktree '${worktreePath}': ${errorMessage}`
            );
            throw e;
        }

        const buttonName = "Force Delete";
        const userMessage = `fatal: '${worktreePath}' contains modified or untracked files, use --force to delete it. Click '${buttonName}' to delete the worktree.`;
        logger.info(`Prompting user to force delete worktree '${worktreePath}'.`);

        const answer = await showInformationMessageWithButton(userMessage, buttonName);

        if (answer !== buttonName) {
            logger.info(`User declined to force delete worktree '${worktreePath}'.`);
            return;
        }

        const forceRemoveWorktreeCommand = `git worktree remove -f ${worktreePath}`;
        try {
            logger.debug(`Running force delete command: ${forceRemoveWorktreeCommand}`);
            await executeCommand(forceRemoveWorktreeCommand, { cwd: workspaceFolder });
            logger.info(
                `Successfully force removed worktree '${worktreePath}'. Pruning worktrees...`
            );
            await pruneWorktrees(workspaceFolder);
        } catch (err: any) {
            logger.error(`Failed to force remove worktree '${worktreePath}': ${err.message}`);
            throw err;
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

export const existsWorktree = async (
    workspaceFolder: string,
    worktree: string
): Promise<boolean> => {
    logger.debug(`Checking existence of worktree '${worktree}' in workspace '${workspaceFolder}'`);

    try {
        const worktrees = await getWorktrees({ workspaceFolder });
        const foundWorktree = worktrees.find((wt) => wt.worktree === worktree);

        if (!foundWorktree) {
            logger.info(`Worktree '${worktree}' does not exist in workspace '${workspaceFolder}'`);
            return false;
        }

        logger.info(`Worktree '${worktree}' exists in workspace '${workspaceFolder}'`);
        return true;
    } catch (e: any) {
        logger.error(`Error checking worktree existence: ${e.message}`);
        throw e;
    }
};

export const pushBranch = async (branch: string, workspaceFolder: string) => {
    const pushCommand = `git push --set-upstream origin ${branch}`;
    await executeCommand(pushCommand, { cwd: workspaceFolder });
};

export const pullBranch = async (worktreePath: string, workspaceFolder: string) => {
    const pullCommand = `git -C ${worktreePath} pull`;
    await executeCommand(pullCommand, { cwd: workspaceFolder });
};

export const addWorktree = async (
    workspaceFolder: string,
    remoteBranch: string,
    newBranch: string
) => {
    showInformationMessage(`Creating new Worktree named '${newBranch}'...`);
    logger.info(`Creating new Worktree named '${newBranch}'`);

    const isSameBranch = remoteBranch === newBranch;

    if (isSameBranch) {
        logger.debug("Adding remote worktree");
        await addRemoteWorktree(workspaceFolder, remoteBranch, newBranch);
    } else {
        logger.debug("Adding new worktree");
        await addNewWorktree(workspaceFolder, remoteBranch, newBranch);
    }
};

export const addNewWorktree = async (
    workspaceFolder: string,
    remoteBranch: string,
    newBranch: string
) => {
    logger.debug(
        `Starting to add new worktree '${newBranch}' tracking remote branch '${remoteBranch}' in workspace '${workspaceFolder}'`
    );

    const isRemoteBranch = await existsRemoteBranch(workspaceFolder, newBranch);
    if (isRemoteBranch) {
        const errorMsg = `Branch '${newBranch}' already exists.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    const newWorktreePath = await calculateNewWorktreePath(workspaceFolder, newBranch);
    logger.info(`Calculated new worktree path: ${newWorktreePath}`);

    try {
        const worktreeAddCommand = `git worktree add --track -b ${newBranch} ${newWorktreePath} origin/${remoteBranch}`;
        logger.debug(`Executing command: ${worktreeAddCommand}`);
        await executeCommand(worktreeAddCommand, { cwd: workspaceFolder });

        if (shouldAutoPushAfterWorktreeCreation) {
            logger.debug(
                `Auto push enabled; pushing new branch '${newBranch}' from workspace '${workspaceFolder}'`
            );
            await pushBranch(newBranch, workspaceFolder);
        }

        await addWorktreePostTasks(workspaceFolder, newWorktreePath, newBranch);
    } catch (e: any) {
        logger.error(`Failed to add new worktree: ${e.message}`);
        throw e;
    }
};

export const addRemoteWorktree = async (
    workspaceFolder: string,
    remoteBranch: string,
    newBranch: string
) => {
    logger.debug(
        `Starting to add remote worktree '${newBranch}' from remote branch '${remoteBranch}' in workspace '${workspaceFolder}'`
    );

    const isRemoteBranch = await existsRemoteBranch(workspaceFolder, remoteBranch);
    if (!isRemoteBranch) {
        const errorMsg = `Branch '${newBranch}' does not exist.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    const newWorktreePath = await calculateNewWorktreePath(workspaceFolder, newBranch);
    logger.info(`Calculated new worktree path: ${newWorktreePath}`);

    try {
        const worktreeAddCommand = `git worktree add ${newWorktreePath} ${newBranch}`;
        logger.debug(`Executing command: ${worktreeAddCommand}`);
        await executeCommand(worktreeAddCommand, { cwd: workspaceFolder });

        if (shouldAutoPullAfterWorktreeCreation) {
            logger.debug(
                `Auto pull enabled; pulling branch '${newBranch}' in '${newWorktreePath}'`
            );
            await pullBranch(newWorktreePath, workspaceFolder);
        }

        await addWorktreePostTasks(workspaceFolder, newWorktreePath, newBranch);
    } catch (e: any) {
        logger.error(`Failed to add remote worktree: ${e.message}`);
        throw e;
    }
};

export const addWorktreePostTasks = async (
    workspaceFolder: string,
    newWorktreePath: string,
    newBranch: string
) => {
    logger.debug(`Checking for submodules in '${newWorktreePath}'`);
    const hasSubs = await hasSubmodules(newWorktreePath);

    if (hasSubs) {
        logger.debug(`Submodules detected. Pulling submodules in '${newWorktreePath}'`);
        await pullSubmodules(newWorktreePath);
        logger.debug(`Successfully pulled submodules in '${newWorktreePath}'`);
    } else {
        logger.debug(`No submodules detected in '${newWorktreePath}'`);
    }

    logger.debug(`Copying worktree files from '${workspaceFolder}' to '${newWorktreePath}'`);
    await copyWorktreeFiles(workspaceFolder, newWorktreePath);

    const newWtInfo = await moveIntoWorktree(workspaceFolder, newWorktreePath);

    logger.info(`Worktree added successfully: Type=${newWtInfo.type}, Path=${newWtInfo.path}`);

    showInformationMessage(
        `Worktree named '${newBranch}' was added successfully. Type: ${newWtInfo.type}, Path: ${newWtInfo.path}`
    );
};

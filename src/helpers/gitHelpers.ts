import * as vscode from "vscode";
import type { InputBoxOptions } from "vscode";
import { executeCommand, spawnCommand } from "./helpers";
import { removeNewLine } from "./stringHelpers";
import { getWorktrees } from "./gitWorktreeHelpers";
import logger from "./logger";
import { BARE_REPOSITORY, BARE_REPOSITORY_REMOTE_ORIGIN_FETCH } from "../constants/constants";

export const selectBranch = async (branches: string[]): Promise<string | undefined> => {
    logger.debug(`Prompting user to select a branch from ${branches.length} remote branches`);

    const selectedBranch = await vscode.window.showQuickPick(
        branches.map((branch) => ({ label: branch })),
        {
            matchOnDetail: true,
            placeHolder: "Select Remote Branch",
        }
    );

    if (selectedBranch) {
        logger.info(`User selected branch: ${selectedBranch.label}`);
    } else {
        logger.info("User cancelled branch selection or did not select any branch.");
    }

    return selectedBranch?.label;
};

export const isGitRepository = async (workspaceFolder: string): Promise<boolean> => {
    logger.debug(`Checking if folder is a Git repository: ${workspaceFolder}`);
    try {
        const isGitRepositoryCommand = "git rev-parse --is-inside-work-tree";
        await executeCommand(isGitRepositoryCommand, {
            cwd: workspaceFolder,
        });
        logger.debug(`Folder ${workspaceFolder} is a Git repository.`);
        return true;
    } catch (e: any) {
        logger.warn(`Folder ${workspaceFolder} is NOT a Git repository. Error: ${e.message}`);
        return false;
    }
};

export const existsRemoteBranch = async (workspaceFolder: string, branch: string) => {
    try {
        const existsRemoteBranchCommand = `git ls-remote origin ${branch}`;
        const { stdout } = await executeCommand(existsRemoteBranchCommand, {
            cwd: workspaceFolder,
        });

        if (!stdout) return false;

        return true;
    } catch (e: any) {
        throw Error(e);
    }
};

export const getRemoteBranches = async (workspaceFolder: string): Promise<string[]> => {
    logger.debug(`Fetching remote branches in workspace: ${workspaceFolder}`);

    try {
        const getRemoteBranchesCommand = `git branch -r`;
        logger.debug(`Executing command: ${getRemoteBranchesCommand}`);

        const { stdout } = await executeCommand(getRemoteBranchesCommand, { cwd: workspaceFolder });

        if (!stdout) {
            logger.info("No remote branches found.");
            return [];
        }

        const branches = stdout
            .split("\n")
            .filter((line: string) => line !== "")
            .filter((line: string) => !line.includes("->")) // exclude HEAD refs
            .filter((line: string) => line.startsWith("  origin/"))
            .map((line: string) => line.substring("  origin/".length))
            .map((branch: string) => branch.trim());

        logger.info(`Found remote branches: ${branches.join(", ")}`);

        return branches;
    } catch (e: any) {
        logger.error(`Failed to get remote branches: ${e.message}`);
        throw e;
    }
};

export const isBareRepository = async (workspaceFolder: string, path: string) => {
    try {
        const { stdout } = await spawnCommand(
            "git",
            ["-C", path, "rev-parse", "--is-bare-repository"],
            { cwd: workspaceFolder }
        );

        const isBareRepo = removeNewLine(stdout);

        return isBareRepo === "true";
    } catch (e: any) {
        throw Error(e);
    }
};

const setUpBareRepositoryFetch = async (workspaceFolder: string) => {
    try {
        const command = "git config remote.origin.fetch";
        const { stdout } = await executeCommand(command, { cwd: workspaceFolder });

        const remoteOriginFetch = removeNewLine(stdout);

        if (remoteOriginFetch === BARE_REPOSITORY_REMOTE_ORIGIN_FETCH) return;

        const setBareRepositoryRemoteOriginFetchCommand = `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`;
        await executeCommand(setBareRepositoryRemoteOriginFetchCommand, { cwd: workspaceFolder });
        return;
    } catch (e: any) {
        // if this repository is bare,
        // then 'git config remote.origin.fetch' command fails
        // and we need to set the remote.origin.fetch
        try {
            const setBareRepositoryRemoteOriginFetchCommand = `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`;
            await executeCommand(setBareRepositoryRemoteOriginFetchCommand, {
                cwd: workspaceFolder,
            });
        } catch (e: any) {
            throw Error(e);
        }
    }
};

const hasBareRepository = async (workspaceFolder: string) => {
    const worktrees = await getWorktrees({
        workspaceFolder,
        withBareRepo: false,
    });
    const hasBareRepo = worktrees.find((wt) => wt.worktree === BARE_REPOSITORY);
    return hasBareRepo;
};

export const fetch = async (workspaceFolder: string) => {
    logger.debug(`Starting git fetch in workspace: ${workspaceFolder}`);

    const hasBareRepo = await hasBareRepository(workspaceFolder);
    logger.debug(`Has bare repository: ${hasBareRepo}`);

    if (hasBareRepo) {
        logger.debug("Setting up bare repository fetch...");
        await setUpBareRepositoryFetch(workspaceFolder);
    }

    try {
        const fetchCommand = `git fetch --all --prune`;
        logger.debug(`Executing command: ${fetchCommand}`);
        await executeCommand(fetchCommand, { cwd: workspaceFolder });
        logger.info("Git fetch completed successfully.");
    } catch (e: any) {
        logger.error(`Git fetch failed: ${e.message}`);
        throw e;
    }
};

export const removeLocalBranchesThatDoNotExistOnRemoteRepository = async (
    workspaceFolder: string
) => {
    logger.debug(
        `Checking for local branches in workspace '${workspaceFolder}' that do not exist on remote repository`
    );

    try {
        const getBranchesCommand = `git branch -vv`;
        logger.debug(`Executing command: ${getBranchesCommand}`);
        const { stdout } = await executeCommand(getBranchesCommand, { cwd: workspaceFolder });

        if (!stdout) {
            logger.info("No local branches found.");
            return;
        }

        const localBranchesThatDoNotExistOnRemoteRepository = stdout
            .split("\n")
            .filter((line: string) => line.includes(": gone]"))
            .filter((line: string) => !line.match(/^[\*\+]/))
            .map((line: string) => line.trim())
            .map((line: string) => line.split(" ")[0]);

        if (localBranchesThatDoNotExistOnRemoteRepository.length === 0) {
            logger.info("No local branches to remove as none are gone on the remote.");
            return;
        }

        logger.info(
            `Removing local branches that no longer exist on remote: ${localBranchesThatDoNotExistOnRemoteRepository.join(
                ", "
            )}`
        );

        await executeCommand(
            `git branch -D ${localBranchesThatDoNotExistOnRemoteRepository.join(" ")}`,
            { cwd: workspaceFolder }
        );

        logger.info("Successfully removed local branches no longer existing on remote.");
    } catch (e: any) {
        logger.error(`Failed to remove local branches that do not exist on remote: ${e.message}`);
        throw e;
    }
};

// we need to check if the user's input value is a valid git branch name
export const isBranchInputValid: InputBoxOptions["validateInput"] = async (branch: string) => {
    // we allow user input an empty string here,
    // because we will assign the remote branch as the new branch later if the input is an empty string
    if (branch === "") return "";

    const isBranchValid = await isBranchNameValid(branch);

    if (!isBranchValid) return `fatal: '${branch}' is not a valid branch name`;

    return "";
};

/**
 * use `git check-ref-format` command to check if a given string is a valid branch name.
 * see https://git-scm.com/docs/git-check-ref-format for more details.
 */
export const isBranchNameValid = async (branchName: string): Promise<boolean> => {
    try {
        const isBranchNameValidCommand = `git check-ref-format --branch "${branchName}"`;
        await executeCommand(isBranchNameValidCommand);

        return true;
    } catch {
        return false;
    }
};

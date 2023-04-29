import * as vscode from "vscode";
import { executeCommand, spawnCommand } from "./helpers";
import { removeNewLine } from "./stringHelpers";
import { getWorktrees } from "./gitWorktreeHelpers";
import { BARE_REPOSITORY, BARE_REPOSITORY_REMOTE_ORIGIN_FETCH } from "../constants/constants";

export const selectBranch = async (branches: string[]): Promise<string | undefined> => {
    const selectedBranch = await vscode.window.showQuickPick(
        branches.map((branch) => ({ label: branch })),
        {
            matchOnDetail: true,
            placeHolder: "Select Remote Branch",
        }
    );

    return selectedBranch?.label;
};

export const isGitRepository = async (workspaceFolder: string): Promise<boolean> => {
    try {
        const isGitRepositoryCommand = "git rev-parse --is-inside-work-tree";
        await executeCommand(isGitRepositoryCommand, {
            cwd: workspaceFolder,
        });

        return true;
    } catch (e: any) {
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
    try {
        const getRemoteBranchesCommand = `git branch -r`;
        const { stdout } = await executeCommand(getRemoteBranchesCommand, { cwd: workspaceFolder });

        if (!stdout) return [];

        return stdout
            .split("\n")
            .filter((line: string) => line !== "")
            .filter((line: string) => !line.includes("->")) // exclude "  origin/HEAD -> origin/master"
            .filter((line: string) => line.startsWith("  origin/"))
            .map((line: string) => line.substring("  origin/".length))
            .map((branch: string) => branch.trim());
    } catch (e: any) {
        throw Error(e);
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
    const hasBareRepo = await hasBareRepository(workspaceFolder);
    if (hasBareRepo) await setUpBareRepositoryFetch(workspaceFolder);

    try {
        const fetchCommand = `git fetch --all --prune`;
        await executeCommand(fetchCommand, { cwd: workspaceFolder });
    } catch (e: any) {
        throw Error(e);
    }
};

export const removeLocalBranchesThatDoNotExistOnRemoteRepository = async (
    workspaceFolder: string
) => {
    try {
        const getBranchesCommand = `git branch -vv`;
        const { stdout } = await executeCommand(getBranchesCommand, { cwd: workspaceFolder });

        if (!stdout) return;

        const localBranchesThatDoNotExistOnRemoteRepository = stdout
            .split("\n")
            .filter((line: string) => line.includes(": gone]"))
            .filter((line: string) => !line.match(/^[\*\+]/))
            .map((line: string) => line.trim())
            .map((line: string) => line.split(" ")[0]);

        if (localBranchesThatDoNotExistOnRemoteRepository.length === 0) return;

        await executeCommand(
            `git branch -D ${localBranchesThatDoNotExistOnRemoteRepository.join(" ")}`,
            { cwd: workspaceFolder }
        );
    } catch (e: any) {
        throw Error(e);
    }
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

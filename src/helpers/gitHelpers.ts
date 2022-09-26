import * as vscode from "vscode";
import { executeCommand } from "./helpers";
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

export const isGitRepository = async (): Promise<boolean> => {
    try {
        const isGitRepositoryCommand = "git rev-parse --is-inside-work-tree";
        await executeCommand(isGitRepositoryCommand);

        return true;
    } catch (e: any) {
        return false;
    }
};

export const existsRemoteBranch = async (branch: string) => {
    try {
        const existsRemoteBranchCommand = `git ls-remote origin ${branch}`;
        const { stdout } = await executeCommand(existsRemoteBranchCommand);

        if (!stdout) return false;

        return true;
    } catch (e: any) {
        throw Error(e);
    }
};

export const getRemoteBranches = async (): Promise<string[]> => {
    try {
        const getRemoteBranchesCommand = `git branch -r`;
        const { stdout } = await executeCommand(getRemoteBranchesCommand);

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

export const isBareRepository = async (path: string) => {
    try {
        const isBareRepositoryCommand = `git -C ${path} rev-parse --is-bare-repository`;
        const { stdout } = await executeCommand(isBareRepositoryCommand);

        const isBareRepo = removeNewLine(stdout);

        return isBareRepo === "true";
    } catch (e: any) {
        throw Error(e);
    }
};

const setUpBareRepositoryFetch = async () => {
    try {
        const { stdout } = await executeCommand("git config remote.origin.fetch");

        const remoteOriginFetch = removeNewLine(stdout);

        if (remoteOriginFetch === BARE_REPOSITORY_REMOTE_ORIGIN_FETCH) return;

        await executeCommand(
            `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`
        );
        return;
    } catch (e: any) {
        // if this repository is bare,
        // then 'git config remote.origin.fetch' command fails
        // and we need to set the remote.origin.fetch
        try {
            await executeCommand(
                `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`
            );
        } catch (e: any) {
            throw Error(e);
        }
    }
};

const hasBareRepository = async () => {
    const worktrees = await getWorktrees(true);
    const hasBareRepo = worktrees.find((wt) => wt.worktree === BARE_REPOSITORY);
    return hasBareRepo;
};

export const fetch = async () => {
    const hasBareRepo = await hasBareRepository();
    if (hasBareRepo) await setUpBareRepositoryFetch();

    try {
        const fetchCommand = `git fetch --all --prune`;
        await executeCommand(fetchCommand);
    } catch (e: any) {
        throw Error(e);
    }
};

export const removeLocalBranchesThatDoNotExistOnRemoteRepository = async () => {
    try {
        const getBranchesCommand = `git branch -vv`;
        const { stdout } = await executeCommand(getBranchesCommand);

        if (!stdout) return;

        const localBranchesThatDoNotExistOnRemoteRepository = stdout
            .split("\n")
            .filter((line: string) => line.includes(": gone]"))
            .filter((line: string) => !line.match(/^[\*\+]/))
            .map((line: string) => line.trim())
            .map((line: string) => line.split(" ")[0]);

        if (localBranchesThatDoNotExistOnRemoteRepository.length === 0) return;

        await executeCommand(
            `git branch -D ${localBranchesThatDoNotExistOnRemoteRepository.join(" ")}`
        );
    } catch (e: any) {
        throw Error(e);
    }
};

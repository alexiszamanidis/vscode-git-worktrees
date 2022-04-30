import * as util from "util";
import * as vscode from "vscode";
import { getWorktrees } from "./gitWorktreeHelpers";
import { executeCommand, getCurrentPath } from "./helpers";
import { BARE_REPOSITORY, BARE_REPOSITORY_REMOTE_ORIGIN_FETCH } from "../constants/constants";
import { removeNewLine } from "./stringHelpers";

const exec = util.promisify(require("child_process").exec);

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
    const command = "git rev-parse --is-inside-work-tree";
    const options = {
        cwd: getCurrentPath(),
    };

    try {
        await exec(command, options);
        // const { stdout } = await exec(command, options);
        // console.log(stdout);
        return true;
    } catch (e: any) {
        // throw Error(e);
        // console.log(e.message);
        return false;
    }
};

export const existsRemoteBranch = async (branch: string) => {
    const currentPath = getCurrentPath();
    const command = `git ls-remote origin ${branch}`;
    const options = {
        cwd: currentPath,
    };

    try {
        const { stdout } = await exec(command, options);
        if (!stdout) return false;
        return true;
    } catch (e: any) {
        throw Error(e);
    }
};

export const getRemoteBranches = async (): Promise<string[]> => {
    const currentPath = getCurrentPath();
    const command = `git branch -r | cut -c10-`;
    const options = {
        cwd: currentPath,
    };

    try {
        const { stdout } = await exec(command, options);
        if (!stdout) return [];
        return stdout
            .split("\n")
            .filter((branch: string) => branch !== "")
            .map((branch: string) => branch.trim());
    } catch (e: any) {
        throw Error(e);
    }
};

export const isBareRepository = async () => {
    const currentPath = getCurrentPath();
    const command = "git rev-parse --is-bare-repository";
    const options = {
        cwd: currentPath,
    };

    try {
        const { stdout } = await exec(command, options);
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
    } catch (e: any) {
        // if this repository is bare,
        // then 'git config remote.origin.fetch' command fails
        // and we need to set the remote.origin.fetch
        await executeCommand(
            `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`
        );
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

    const currentPath = getCurrentPath();
    const command = `git fetch --all --prune`;
    const options = {
        cwd: currentPath,
    };

    try {
        await exec(command, options);
    } catch (e: any) {
        throw Error(e);
    }
};

export const removeLocalBranchesThatDoNotExistOnRemoteRepository = async () => {
    const currentPath = getCurrentPath();
    const command = `git branch -vv | awk '/: gone]/{print $1}' | awk '!/^(*|+)/' | xargs --no-run-if-empty git branch -D`;
    const options = {
        cwd: currentPath,
    };

    try {
        await exec(command, options);
    } catch (e: any) {
        throw Error(e);
    }
};

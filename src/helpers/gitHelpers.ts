import * as util from "util";
import { getCurrentPath } from "./helpers";

const exec = util.promisify(require("child_process").exec);

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

export const getRemoteBranches = async () => {
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
        const isBareRepo = stdout.replace(/\n/g, "");
        return isBareRepo === "true";
    } catch (e: any) {
        throw Error(e);
    }
};

export const gitFetch = async () => {
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

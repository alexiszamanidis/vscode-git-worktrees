import * as util from "util";
import * as vscode from "vscode";
import * as path from "path";
import { pipeline as pipelineCallback } from "stream";
import { promisify } from "util";

import { SpawnOptionsWithoutStdio, spawn } from "child_process";
import { EXTENSION_ID, DEMO_URL } from "../constants/constants";
import { showInformationMessageWithButton } from "./vsCodeHelpers";
import { createReadStream, createWriteStream, promises } from "fs";

const exec = util.promisify(require("child_process").exec);
const pipeline = promisify(pipelineCallback);

export const getCurrentPath = () => vscode.workspace.rootPath;

export const getWorkspaceFilePath = () => vscode.workspace.workspaceFile;

export const copyToClipboard = async (content = "") =>
    await vscode.env.clipboard.writeText(util.inspect(content));

const calculateBrowserStart = async () => {
    let start = "xdg-open";

    if (process.platform === "darwin") start = "open";
    else if (process.platform === "win32") start = "start";

    return start;
};

export const openBrowser = async (url = "") => {
    const start = await calculateBrowserStart();
    await require("child_process").exec(start + " " + url);
};

export const executeCommand = async (
    command: string,
    options?: { cwd: string; [key: string]: any }
) => {
    try {
        const { stdout } = await exec(command, options);
        return { stdout };
    } catch (e: any) {
        const errorMessage = `command: '${command}'. error: '${e.message}'`;
        throw Error(errorMessage);
    }
};

// modified from https://stackoverflow.com/a/67379845/9979122
export const spawnCommand = async (
    command: string,
    args?: string[],
    options?: SpawnOptionsWithoutStdio
) => {
    return new Promise<{ stdout: string }>((resolve, reject) => {
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];

        const subprocess = spawn(command, args, options);

        subprocess.stdout.on("data", (chunk) => {
            stdoutChunks.push(chunk);
        });

        subprocess.stderr.on("data", (chunk) => {
            stderrChunks.push(chunk);
        });

        subprocess.on("error", (error) => {
            reject(error);
        });

        subprocess.on("exit", (code) => {
            if (code !== 0) {
                reject(Buffer.concat(stderrChunks).toString());
            }

            resolve({ stdout: Buffer.concat(stdoutChunks).toString() });
        });
    });
};

export const isMajorUpdate = (previousVersion: string, currentVersion: string) => {
    // rain-check for malformed string
    if (previousVersion.indexOf(".") === -1) return true;

    //returns int array [1,1,1] i.e. [major,minor,patch]
    const previousVerArr = previousVersion.split(".").map(Number);
    const currentVerArr = currentVersion.split(".").map(Number);

    if (currentVerArr[0] > previousVerArr[0]) return true;

    return false;
};

export const showWhatsNew = async (context: vscode.ExtensionContext) => {
    try {
        const previousVersion = context.globalState.get<string>(EXTENSION_ID);
        const currentVersion = vscode.extensions.getExtension(EXTENSION_ID)!.packageJSON.version;

        // store latest version
        context.globalState.update(EXTENSION_ID, currentVersion);

        if (previousVersion !== undefined && !isMajorUpdate(previousVersion, currentVersion))
            return;
        const buttonName = "View Demo";

        const answer = await showInformationMessageWithButton(
            `v${currentVersion} - Git Worktree Add Feature is now available!`,
            buttonName
        );

        if (answer !== buttonName) return;

        await openBrowser(DEMO_URL);
    } catch (e) {
        console.log("showWhatsNew: Error", e);
    }
};

export async function copyWorktreeFiles(sourceRepo: string, targetWorktree: string) {
    try {
        const patterns = worktreeCopyIncludePatterns;
        const ignorePatterns = worktreeCopyExcludePatterns;

        if (patterns.length === 0) return;

        // Find matching files
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(sourceRepo, `{${patterns.join(",")}}`),
            `{${ignorePatterns.join(",")}}`
        );

        // Copy the found files
        for (const file of files) {
            const relativePath = path.relative(sourceRepo, file.fsPath);
            const targetPath = path.join(targetWorktree, relativePath);
            const targetDir = path.dirname(targetPath);

            // Ensure target directory exists
            await promises.mkdir(targetDir, { recursive: true });

            // Copy single file
            await pipeline(createReadStream(file.fsPath), createWriteStream(targetPath));
        }
    } catch (e: any) {
        throw Error(e);
    }
}

export const shouldRemoveStalledBranches =
    vscode.workspace.getConfiguration().get("vsCodeGitWorktrees.remove.stalledBranches") ?? false;

export const shouldOpenNewVscodeWindow =
    vscode.workspace.getConfiguration().get("vsCodeGitWorktrees.move.openNewVscodeWindow") ?? true;

export const worktreesDirPath =
    vscode.workspace.getConfiguration().get("vsCodeGitWorktrees.worktrees.dir.path") ?? null;

export const shouldAutoPushAfterWorktreeCreation =
    vscode.workspace.getConfiguration().get("vsCodeGitWorktrees.add.autoPush") ?? true;

export const shouldAutoPullAfterWorktreeCreation =
    vscode.workspace.getConfiguration().get("vsCodeGitWorktrees.add.autoPull") ?? true;

export const worktreeCopyIncludePatterns =
    (vscode.workspace
        .getConfiguration()
        .get("vsCodeGitWorktrees.worktreeCopyIncludePatterns") as string[]) ?? [];

export const worktreeCopyExcludePatterns =
    (vscode.workspace
        .getConfiguration()
        .get("vsCodeGitWorktrees.worktreeCopyExcludePatterns") as string[]) ?? [];

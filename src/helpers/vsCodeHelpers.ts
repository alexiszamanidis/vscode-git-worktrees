import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import logger from "../helpers/logger";
import { isGitRepository } from "./gitHelpers";
import { worktreeSearchPath } from "./helpers";
import { APP_NAME } from "../constants/constants";

type WorkspaceFolder = vscode.WorkspaceFolder;
type SelectedWorkspaceFolder = { label: string; detail: string };

export const showErrorMessageWithButton = async ({ errorMessage = "", buttonName = "" }) =>
    await vscode.window.showErrorMessage(`${APP_NAME}: ${errorMessage}`, buttonName);

export const showErrorMessage = async (errorMessage: string): Promise<string | undefined> =>
    await vscode.window.showErrorMessage(`${APP_NAME}: ${errorMessage}`);

export const showInformationMessage = async (
    informationMessage: string
): Promise<string | undefined> =>
    await vscode.window.showInformationMessage(`${APP_NAME}: ${informationMessage}`);

export const showInformationMessageWithButton = async (
    informationMessage: string,
    buttonName: string
): Promise<string | undefined> =>
    await vscode.window.showInformationMessage(`${APP_NAME}: ${informationMessage}`, buttonName);

export const getUserInput = async (
    placeHolder: string,
    prompt: string,
    validateInput?: vscode.InputBoxOptions["validateInput"]
) => {
    const input = await vscode.window.showInputBox({
        placeHolder,
        prompt,
        validateInput,
    });

    return input;
};

const getWorkspaceFolders = async () => vscode.workspace.workspaceFolders;

const selectWorkspaceFolder = async (
    workspaceFolders: readonly WorkspaceFolder[]
): Promise<SelectedWorkspaceFolder | undefined> =>
    vscode.window.showQuickPick(
        workspaceFolders.map((wf) => ({ label: wf.name, detail: wf.uri.fsPath })),
        {
            matchOnDetail: true,
        }
    );

function resolveSearchPath(basePath: string): string {
    if (!worktreeSearchPath) return basePath;
    return path.isAbsolute(worktreeSearchPath)
        ? worktreeSearchPath
        : path.join(basePath, worktreeSearchPath);
}

export const getWorkspaceFolder = async (): Promise<string | null> => {
    logger.debug("🔍 Fetching workspace folders...");
    const workspaceFolders = await getWorkspaceFolders();

    if (!workspaceFolders || workspaceFolders.length === 0) {
        logger.info("No workspaces found.");
        vscode.window.showInformationMessage("No workspaces found.");
        return null;
    }

    let selectedWorkspacePath: string;

    if (workspaceFolders.length === 1) {
        selectedWorkspacePath = workspaceFolders[0].uri.fsPath;
        logger.debug(`Only one workspace folder: ${selectedWorkspacePath}`);
    } else {
        logger.debug("Prompting user to select a workspace folder...");
        const workspaceFolder = await selectWorkspaceFolder(workspaceFolders);

        if (!workspaceFolder) {
            logger.info("No workspace selected by user.");
            vscode.window.showInformationMessage("No workspace selected.");
            return null;
        }

        selectedWorkspacePath = workspaceFolder.detail;
        logger.debug(`User selected workspace folder: ${selectedWorkspacePath}`);
    }

    // Case 1: Check if selected workspace is already a Git repo
    if (await isGitRepository(selectedWorkspacePath)) {
        logger.debug("Workspace folder is already a Git repository. Using it directly.");
        return selectedWorkspacePath;
    }

    const searchPath = resolveSearchPath(selectedWorkspacePath);

    if (!fs.existsSync(searchPath)) {
        const msg = `Configured path does not exist: ${searchPath}`;
        logger.info(msg);
        vscode.window.showErrorMessage(msg);
        return null;
    }

    logger.debug(`📁 Scanning subdirectories in: ${searchPath}`);

    const subdirs = fs
        .readdirSync(searchPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(searchPath, d.name));

    const validRepos: string[] = [];

    for (const dir of subdirs) {
        if (await isGitRepository(dir)) {
            validRepos.push(dir);
        }
    }

    if (validRepos.length === 0) {
        logger.info("No Git repositories found in search path.");
        vscode.window.showInformationMessage("No Git repositories found in the specified path.");
        return null;
    }

    if (validRepos.length === 1) {
        logger.debug(`✅ One Git repo found: ${validRepos[0]}`);
        return validRepos[0];
    }

    logger.debug(`🧩 Multiple Git repos found. Prompting user to select one.`);

    const picked = await vscode.window.showQuickPick(validRepos, {
        placeHolder: "Select a Git repository to work with",
    });

    if (!picked) {
        logger.info("No repository selected.");
        return null;
    }

    logger.debug(`User selected repository: ${picked}`);
    return picked;
};

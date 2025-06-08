import * as vscode from "vscode";
import { APP_NAME } from "../constants/constants";
import logger from "../helpers/logger";

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

export const getWorkspaceFolder = async () => {
    logger.debug("Fetching workspace folders...");
    const workspaceFolders = await getWorkspaceFolders();

    if (workspaceFolders === undefined) {
        logger.info("No workspaces found.");
        vscode.window.showInformationMessage("No workspaces found.");
        return null;
    }

    logger.debug(`Found ${workspaceFolders.length} workspace folder(s).`);

    // TODO: add an environment variable for enabling/disabling this behaviour
    // if there is only one workspace opened,
    // then the user doesn't need to select a workspace
    // just return the only one opened
    if (workspaceFolders.length === 1) {
        logger.debug(
            `Only one workspace folder available: ${workspaceFolders[0].uri.fsPath}, returning it automatically.`
        );
        return workspaceFolders[0].uri.fsPath;
    }

    logger.debug("Prompting user to select a workspace folder...");
    const workspaceFolder = await selectWorkspaceFolder(workspaceFolders);

    if (workspaceFolder === undefined) {
        logger.info("No workspace selected by user.");
        vscode.window.showInformationMessage("No workspaces selected.");
        return null;
    }

    logger.debug(`User selected workspace folder: ${workspaceFolder.detail}`);
    return workspaceFolder.detail;
};

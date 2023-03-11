import * as vscode from "vscode";
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

export const getWorkspaceFolder = async () => {
    const workspaceFolders = await getWorkspaceFolders();

    if (workspaceFolders === undefined) {
        vscode.window.showInformationMessage("No workspaces found.");
        return null;
    }

    // TODO: add an environment variable for enabling/disabling this behaviour
    // if there is only one workspace opened,
    // then the user doesn't need to select a workspace
    // just return the only one opened
    if (workspaceFolders.length === 1) {
        return workspaceFolders[0].uri.fsPath;
    }

    const workspaceFolder = await selectWorkspaceFolder(workspaceFolders);

    if (workspaceFolder === undefined) {
        vscode.window.showInformationMessage("No workspaces selected.");
        return null;
    }

    return workspaceFolder.detail;
};

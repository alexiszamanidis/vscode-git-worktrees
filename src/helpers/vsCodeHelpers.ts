import * as vscode from "vscode";
import { APP_NAME } from "../constants/constants";

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

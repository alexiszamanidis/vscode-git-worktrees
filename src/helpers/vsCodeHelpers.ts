import * as vscode from "vscode";
import { APP_NAME } from "@constants/constants";

export const showErrorMessageWithButton = async ({ errorMessage = "", buttonName = "" }) =>
    await vscode.window.showErrorMessage(`${APP_NAME}: ${errorMessage}`, buttonName);

export const showErrorMessage = async (errorMessage: string): Promise<string | undefined> =>
    await vscode.window.showErrorMessage(`${APP_NAME}: ${errorMessage}`);

export const showInformationMessage = async (
    informationMessage: string
): Promise<string | undefined> =>
    await vscode.window.showInformationMessage(`${APP_NAME}: ${informationMessage}`);

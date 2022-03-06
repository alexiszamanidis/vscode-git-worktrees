import * as vscode from "vscode";
import { APP_NAME } from "../constants/constants";

export const showErrorMessage = async (errorMessage: string) =>
    await vscode.window.showErrorMessage(`${APP_NAME}: ${errorMessage}`);

export const showInformationMessage = async (informationMessage: string) =>
    await vscode.window.showInformationMessage(`${APP_NAME}: ${informationMessage}`);

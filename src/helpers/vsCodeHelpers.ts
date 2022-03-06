import * as vscode from "vscode";
import { APP_NAME } from "../constants/constants";

export const showErrorMessage = async (errorMessage: string) =>
    vscode.window.showErrorMessage(`${APP_NAME}: ${errorMessage}`);

export const showInformationMessage = async (informationMessage: string) =>
    vscode.window.showInformationMessage(`${APP_NAME}: ${informationMessage}`);

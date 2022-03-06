import * as vscode from "vscode";

export const showErrorMessage = async (errorMessage: string) =>
    vscode.window.showErrorMessage(errorMessage);

export const showInformationMessage = async (informationMessage: string) =>
    vscode.window.showInformationMessage(informationMessage);

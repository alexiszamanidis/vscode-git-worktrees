import * as util from "util";
import * as vscode from "vscode";

export const getCurrentPath = () => vscode.workspace.rootPath;

// TODO: fix this function
export const copyToClipboard = async (content = "") =>
    await require("child_process").spawn("clip").stdin.end(util.inspect(content));

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

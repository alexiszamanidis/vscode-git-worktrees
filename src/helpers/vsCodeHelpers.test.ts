import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import {
    getWorkspaceFolder,
    getUserInput,
    showErrorMessage,
    showErrorMessageWithButton,
    showInformationMessage,
    showInformationMessageWithButton,
} from "./vsCodeHelpers";
import * as gitHelpers from "./gitHelpers";
import * as helpers from "./helpers";
import { APP_NAME } from "../constants/constants";

jest.mock("vscode");
jest.mock("./gitHelpers", () => ({
    isGitRepository: jest.fn(),
}));
jest.mock("./helpers", () => ({
    worktreeSearchPath: null,
}));
jest.mock("./logger", () => ({
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockedIsGitRepository = gitHelpers.isGitRepository as jest.MockedFunction<
    typeof gitHelpers.isGitRepository
>;

const makeFolder = (fsPath: string, name = path.basename(fsPath)): vscode.WorkspaceFolder =>
    ({
        uri: { fsPath } as vscode.Uri,
        name,
        index: 0,
    } as vscode.WorkspaceFolder);

describe("vsCodeHelpers messages", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("prefixes error messages with the app name", async () => {
        await showErrorMessage("boom");

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(`${APP_NAME}: boom`);
    });

    it("prefixes error messages with a button", async () => {
        await showErrorMessageWithButton({ errorMessage: "boom", buttonName: "Retry" });

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(`${APP_NAME}: boom`, "Retry");
    });

    it("uses empty defaults when error message options are omitted", async () => {
        await showErrorMessageWithButton({});

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(`${APP_NAME}: `, "");
    });

    it("prefixes information messages with the app name", async () => {
        await showInformationMessage("ok");

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`${APP_NAME}: ok`);
    });

    it("prefixes information messages with a button", async () => {
        await showInformationMessageWithButton("ok", "View");

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            `${APP_NAME}: ok`,
            "View"
        );
    });

    it("forwards input box options including validateInput", async () => {
        const validateInput = jest.fn();
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue("feature");

        const result = await getUserInput("New branch", "Type a name", validateInput);

        expect(vscode.window.showInputBox).toHaveBeenCalledWith({
            placeHolder: "New branch",
            prompt: "Type a name",
            validateInput,
        });
        expect(result).toBe("feature");
    });

    it("forwards input box options without validateInput", async () => {
        (vscode.window.showInputBox as jest.Mock).mockResolvedValue("feature");

        const result = await getUserInput("New branch", "Type a name");

        expect(vscode.window.showInputBox).toHaveBeenCalledWith({
            placeHolder: "New branch",
            prompt: "Type a name",
            validateInput: undefined,
        });
        expect(result).toBe("feature");
    });
});

describe("getWorkspaceFolder", () => {
    let tempRoot: string;

    beforeEach(() => {
        jest.clearAllMocks();
        tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-ws-"));
        (vscode.workspace as any).workspaceFolders = [];
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = null;
        mockedIsGitRepository.mockResolvedValue(false);
    });

    afterEach(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });

    it("returns null when there are no workspace folders", async () => {
        (vscode.workspace as any).workspaceFolders = undefined;

        await expect(getWorkspaceFolder()).resolves.toBeNull();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("No workspaces found.");
    });

    it("returns the only workspace folder when it is a git repo", async () => {
        const repo = path.join(tempRoot, "repo");
        fs.mkdirSync(repo);
        (vscode.workspace as any).workspaceFolders = [makeFolder(repo)];
        mockedIsGitRepository.mockResolvedValue(true);

        await expect(getWorkspaceFolder()).resolves.toBe(repo);
        expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    });

    it("lets the user pick among multiple workspace folders", async () => {
        const repoA = path.join(tempRoot, "a");
        const repoB = path.join(tempRoot, "b");
        fs.mkdirSync(repoA);
        fs.mkdirSync(repoB);
        (vscode.workspace as any).workspaceFolders = [
            makeFolder(repoA, "a"),
            makeFolder(repoB, "b"),
        ];
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "b",
            detail: repoB,
        });
        mockedIsGitRepository.mockResolvedValue(true);

        await expect(getWorkspaceFolder()).resolves.toBe(repoB);
    });

    it("returns null when the user cancels workspace selection", async () => {
        (vscode.workspace as any).workspaceFolders = [
            makeFolder(path.join(tempRoot, "a"), "a"),
            makeFolder(path.join(tempRoot, "b"), "b"),
        ];
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

        await expect(getWorkspaceFolder()).resolves.toBeNull();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("No workspace selected.");
    });

    it("scans workspace subfolders when it is not a git repo and no search path is set", async () => {
        const workspace = path.join(tempRoot, "workspace");
        const nestedRepo = path.join(workspace, "only");
        fs.mkdirSync(nestedRepo, { recursive: true });
        (vscode.workspace as any).workspaceFolders = [makeFolder(workspace)];
        mockedIsGitRepository.mockImplementation(async (dir) => dir === nestedRepo);
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = null;

        await expect(getWorkspaceFolder()).resolves.toBe(nestedRepo);
    });

    it("returns null when a configured search path does not exist", async () => {
        const workspace = path.join(tempRoot, "workspace");
        fs.mkdirSync(workspace);
        (vscode.workspace as any).workspaceFolders = [makeFolder(workspace)];
        mockedIsGitRepository.mockResolvedValue(false);
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = path.join(
            tempRoot,
            "missing"
        );

        await expect(getWorkspaceFolder()).resolves.toBeNull();
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            `Configured path does not exist: ${path.join(tempRoot, "missing")}`
        );
    });

    it("returns null when no git repos are found under the search path", async () => {
        const workspace = path.join(tempRoot, "workspace");
        const search = path.join(tempRoot, "search");
        fs.mkdirSync(workspace);
        fs.mkdirSync(path.join(search, "empty"), { recursive: true });
        (vscode.workspace as any).workspaceFolders = [makeFolder(workspace)];
        mockedIsGitRepository.mockResolvedValue(false);
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = search;

        await expect(getWorkspaceFolder()).resolves.toBeNull();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            "No Git repositories found in the specified path."
        );
    });

    it("returns the only git repo found under a relative search path", async () => {
        const workspace = path.join(tempRoot, "workspace");
        const nestedRepo = path.join(workspace, "repos", "only");
        fs.mkdirSync(nestedRepo, { recursive: true });
        (vscode.workspace as any).workspaceFolders = [makeFolder(workspace)];
        mockedIsGitRepository.mockImplementation(async (dir) => dir === nestedRepo);
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = "repos";

        await expect(getWorkspaceFolder()).resolves.toBe(nestedRepo);
    });

    it("lets the user pick among multiple git repos under an absolute search path", async () => {
        const workspace = path.join(tempRoot, "workspace");
        const search = path.join(tempRoot, "search");
        const repoA = path.join(search, "repo-a");
        const repoB = path.join(search, "repo-b");
        fs.mkdirSync(workspace);
        fs.mkdirSync(repoA, { recursive: true });
        fs.mkdirSync(repoB, { recursive: true });
        (vscode.workspace as any).workspaceFolders = [makeFolder(workspace)];
        mockedIsGitRepository.mockImplementation(async (dir) => dir === repoA || dir === repoB);
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = search;
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(repoB);

        await expect(getWorkspaceFolder()).resolves.toBe(repoB);
        expect(vscode.window.showQuickPick).toHaveBeenCalledWith([repoA, repoB], {
            placeHolder: "Select a Git repository to work with",
        });
    });

    it("returns null when the user cancels git repo selection", async () => {
        const workspace = path.join(tempRoot, "workspace");
        const search = path.join(tempRoot, "search");
        fs.mkdirSync(workspace);
        fs.mkdirSync(path.join(search, "repo-a"), { recursive: true });
        fs.mkdirSync(path.join(search, "repo-b"), { recursive: true });
        (vscode.workspace as any).workspaceFolders = [makeFolder(workspace)];
        mockedIsGitRepository.mockResolvedValueOnce(false).mockResolvedValue(true);
        (helpers as { worktreeSearchPath: string | null }).worktreeSearchPath = search;
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

        await expect(getWorkspaceFolder()).resolves.toBeNull();
    });
});

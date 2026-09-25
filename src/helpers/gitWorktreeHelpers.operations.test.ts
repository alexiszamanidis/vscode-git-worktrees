import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
    addNewWorktree,
    addRemoteWorktree,
    addWorktree,
    existsWorktree,
    findDefaultWorktreeToMove,
    getWorktree,
    getWorktrees,
    moveIntoWorktree,
    pruneWorktrees,
    pullBranch,
    pushBranch,
    removeWorktree,
} from "./gitWorktreeHelpers";
import * as helpers from "./helpers";
import * as gitHelpers from "./gitHelpers";
import * as vsCodeHelpers from "./vsCodeHelpers";

jest.mock("vscode");
jest.mock("./helpers", () => ({
    executeCommand: jest.fn(),
    getWorktreesDirPath: jest.fn(() => "/worktrees"),
    shouldPreserveSubfolderOnWorktreeSwitch: jest.fn(() => true),
    copyWorktreeFiles: jest.fn(),
    applyWorktreeColor: jest.fn(),
    getWorkspaceFilePath: jest.fn(),
    shouldOpenNewVscodeWindow: true,
    shouldAutoPushAfterWorktreeCreation: true,
    shouldAutoPullAfterWorktreeCreation: true,
    spawnCommand: jest.fn(),
}));
jest.mock("./logger", () => ({
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock("./gitHelpers", () => ({
    existsRemoteBranch: jest.fn(),
    isBareRepository: jest.fn(),
    hasSubmodules: jest.fn(),
    pullSubmodules: jest.fn(),
}));
jest.mock("./vsCodeHelpers", () => ({
    showInformationMessage: jest.fn(),
    showInformationMessageWithButton: jest.fn(),
}));

const mockedExecuteCommand = helpers.executeCommand as jest.MockedFunction<
    typeof helpers.executeCommand
>;
const mockedSpawnCommand = helpers.spawnCommand as jest.MockedFunction<typeof helpers.spawnCommand>;
const mockedGetWorktreesDirPath = helpers.getWorktreesDirPath as jest.MockedFunction<
    typeof helpers.getWorktreesDirPath
>;
const mockedGetWorkspaceFilePath = helpers.getWorkspaceFilePath as jest.MockedFunction<
    typeof helpers.getWorkspaceFilePath
>;
const mockedCopyWorktreeFiles = helpers.copyWorktreeFiles as jest.MockedFunction<
    typeof helpers.copyWorktreeFiles
>;
const mockedApplyWorktreeColor = helpers.applyWorktreeColor as jest.MockedFunction<
    typeof helpers.applyWorktreeColor
>;
const mockedShouldPreserveSubfolder =
    helpers.shouldPreserveSubfolderOnWorktreeSwitch as jest.MockedFunction<
        typeof helpers.shouldPreserveSubfolderOnWorktreeSwitch
    >;
const mockedExistsRemoteBranch = gitHelpers.existsRemoteBranch as jest.MockedFunction<
    typeof gitHelpers.existsRemoteBranch
>;
const mockedHasSubmodules = gitHelpers.hasSubmodules as jest.MockedFunction<
    typeof gitHelpers.hasSubmodules
>;
const mockedPullSubmodules = gitHelpers.pullSubmodules as jest.MockedFunction<
    typeof gitHelpers.pullSubmodules
>;
const mockedShowInformationMessageWithButton =
    vsCodeHelpers.showInformationMessageWithButton as jest.MockedFunction<
        typeof vsCodeHelpers.showInformationMessageWithButton
    >;

const workspaceFolder = "/repo";
const worktreeListStdout = ["/repo  abc1234 [main]", "/worktrees/feature  def5678 [feature]"].join(
    "\n"
);

const mockShowToplevel = () => {
    mockedExecuteCommand.mockImplementation(async (command: string) => {
        if (command === "git rev-parse --show-toplevel") {
            return { stdout: "/repo\n" };
        }
        if (command === "git worktree list") {
            return { stdout: worktreeListStdout };
        }
        return { stdout: "" };
    });
};

describe("moveIntoWorktree", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedShouldPreserveSubfolder.mockReturnValue(true);
        mockedGetWorkspaceFilePath.mockReturnValue(undefined);
        mockShowToplevel();
        (vscode.Uri.file as jest.Mock).mockImplementation((fsPath: string) => ({
            fsPath,
            scheme: "file",
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("preserves a .code-workspace relative path", async () => {
        mockedGetWorkspaceFilePath.mockReturnValue({
            fsPath: "/repo/apps/my.code-workspace",
        } as vscode.Uri);
        jest.spyOn(fs, "existsSync").mockReturnValue(true);

        const result = await moveIntoWorktree(workspaceFolder, "/worktrees/feature");

        expect(result).toEqual({
            type: "workspace",
            path: path.join("/worktrees/feature", "apps", "my.code-workspace"),
        });
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
            "vscode.openFolder",
            expect.objectContaining({
                fsPath: path.join("/worktrees/feature", "apps", "my.code-workspace"),
            }),
            { forceNewWindow: true }
        );
        expect(mockedApplyWorktreeColor).toHaveBeenCalledWith(
            path.join("/worktrees/feature", "apps", "my.code-workspace")
        );
    });

    it("opens the worktree root when the .code-workspace file is missing", async () => {
        mockedGetWorkspaceFilePath.mockReturnValue({
            fsPath: "/repo/apps/my.code-workspace",
        } as vscode.Uri);
        jest.spyOn(fs, "existsSync").mockReturnValue(false);

        const result = await moveIntoWorktree(workspaceFolder, "/worktrees/feature");

        expect(result).toEqual({ type: "folder", path: "/worktrees/feature" });
    });

    it("preserves a nested subfolder when the setting is on", async () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);

        const result = await moveIntoWorktree("/repo/packages/app", "/worktrees/feature");

        expect(result).toEqual({
            type: "folder",
            path: path.join("/worktrees/feature", "packages", "app"),
        });
    });

    it("opens the worktree root when the preserved subfolder is missing", async () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(false);

        const result = await moveIntoWorktree("/repo/packages/app", "/worktrees/feature");

        expect(result).toEqual({ type: "folder", path: "/worktrees/feature" });
    });

    it("opens the worktree root when preserve-subfolder is off", async () => {
        mockedShouldPreserveSubfolder.mockReturnValue(false);

        const result = await moveIntoWorktree("/repo/packages/app", "/worktrees/feature");

        expect(result).toEqual({ type: "folder", path: "/worktrees/feature" });
    });
});

describe("getWorktrees", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("parses git worktree list output", async () => {
        mockedExecuteCommand.mockResolvedValue({ stdout: worktreeListStdout });

        const worktrees = await getWorktrees({ workspaceFolder });

        expect(mockedExecuteCommand).toHaveBeenCalledWith("git worktree list", {
            cwd: workspaceFolder,
        });
        expect(worktrees).toEqual([
            { path: "/repo", hash: "abc1234", worktree: "main" },
            { path: "/worktrees/feature", hash: "def5678", worktree: "feature" },
        ]);
    });

    it("throws when git worktree list fails", async () => {
        mockedExecuteCommand.mockRejectedValue(new Error("not a git repo"));

        await expect(getWorktrees({ workspaceFolder })).rejects.toThrow("not a git repo");
    });
});

describe("getWorktree", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedExecuteCommand.mockResolvedValue({ stdout: worktreeListStdout });
    });

    it("returns the worktree selected in the QuickPick", async () => {
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "feature",
            detail: "/worktrees/feature",
        });

        const result = await getWorktree(workspaceFolder);

        expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
            [
                { label: "main", detail: "/repo" },
                { label: "feature", detail: "/worktrees/feature" },
            ],
            { matchOnDetail: true }
        );
        expect(result).toEqual({ label: "feature", detail: "/worktrees/feature" });
    });

    it("logs the path when the selected worktree has no label", async () => {
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "",
            detail: "/worktrees/feature",
        });

        const result = await getWorktree(workspaceFolder);

        expect(result).toEqual({ label: "", detail: "/worktrees/feature" });
    });

    it("logs unknown when the selected worktree has no label or path", async () => {
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
            label: "",
            detail: "",
        });

        const result = await getWorktree(workspaceFolder);

        expect(result).toEqual({ label: "", detail: "" });
    });

    it("returns undefined when the user cancels", async () => {
        (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

        const result = await getWorktree(workspaceFolder);

        expect(result).toBeUndefined();
    });
});

describe("existsWorktree", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedExecuteCommand.mockResolvedValue({ stdout: worktreeListStdout });
    });

    it("returns true when the branch already has a worktree", async () => {
        await expect(existsWorktree(workspaceFolder, "feature")).resolves.toBe(true);
    });

    it("returns false when the branch has no worktree", async () => {
        await expect(existsWorktree(workspaceFolder, "missing")).resolves.toBe(false);
    });

    it("throws when listing worktrees fails", async () => {
        mockedExecuteCommand.mockRejectedValue(new Error("git failed"));

        await expect(existsWorktree(workspaceFolder, "feature")).rejects.toThrow("git failed");
    });
});

describe("pruneWorktrees", () => {
    it("runs git worktree prune", async () => {
        mockedExecuteCommand.mockResolvedValue({ stdout: "" });

        await pruneWorktrees(workspaceFolder);

        expect(mockedExecuteCommand).toHaveBeenCalledWith("git worktree prune", {
            cwd: workspaceFolder,
        });
    });

    it("throws when prune fails", async () => {
        mockedExecuteCommand.mockRejectedValue(new Error("prune failed"));

        await expect(pruneWorktrees(workspaceFolder)).rejects.toThrow("prune failed");
    });
});

describe("findDefaultWorktreeToMove", () => {
    const current = { label: "feature", detail: "/worktrees/feature" };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("prefers a main branch worktree", async () => {
        mockedExecuteCommand.mockResolvedValue({ stdout: worktreeListStdout });

        const result = await findDefaultWorktreeToMove(current, workspaceFolder);

        expect(result).toEqual({ label: "main", detail: "/repo" });
    });

    it("falls back to the first remaining worktree when no main branch exists", async () => {
        mockedExecuteCommand.mockResolvedValue({
            stdout: [
                "/worktrees/feature  def5678 [feature]",
                "/worktrees/other  aaa1111 [other]",
            ].join("\n"),
        });

        const result = await findDefaultWorktreeToMove(current, workspaceFolder);

        expect(result).toEqual({ label: "other", detail: "/worktrees/other" });
    });

    it("falls back to the parent directory when no other worktrees exist", async () => {
        mockedExecuteCommand.mockResolvedValue({
            stdout: "/worktrees/feature  def5678 [feature]\n",
        });

        const result = await findDefaultWorktreeToMove(current, workspaceFolder);

        expect(result).toEqual({
            label: "",
            detail: path.dirname("/worktrees/feature"),
        });
    });

    it("throws when listing worktrees fails", async () => {
        mockedExecuteCommand.mockRejectedValue(new Error("list failed"));

        await expect(findDefaultWorktreeToMove(current, workspaceFolder)).rejects.toThrow(
            "list failed"
        );
    });
});

describe("removeWorktree", () => {
    const worktree = { label: "feature", detail: "/worktrees/feature" };

    beforeEach(() => {
        jest.clearAllMocks();
        mockedExecuteCommand.mockResolvedValue({ stdout: "" });
        mockedShowInformationMessageWithButton.mockResolvedValue(undefined);
    });

    it("throws when removing the current worktree", async () => {
        await expect(removeWorktree("/worktrees/feature", worktree)).rejects.toThrow(
            "You cannot delete the same Worktree as the one you are currently working on"
        );
        expect(mockedExecuteCommand).not.toHaveBeenCalled();
    });

    it("removes a clean worktree and prunes", async () => {
        await removeWorktree(workspaceFolder, worktree);

        expect(mockedExecuteCommand).toHaveBeenNthCalledWith(
            1,
            "git worktree remove /worktrees/feature",
            { cwd: workspaceFolder }
        );
        expect(mockedExecuteCommand).toHaveBeenNthCalledWith(2, "git worktree prune", {
            cwd: workspaceFolder,
        });
    });

    it("rethrows unexpected git errors", async () => {
        mockedExecuteCommand.mockRejectedValue(new Error("device busy"));

        await expect(removeWorktree(workspaceFolder, worktree)).rejects.toThrow("device busy");
        expect(mockedShowInformationMessageWithButton).not.toHaveBeenCalled();
    });

    it("stops when the user declines force-delete of a dirty worktree", async () => {
        const dirtyError = `Command failed: git worktree remove /worktrees/feature\nfatal: '/worktrees/feature' contains modified or untracked files, use --force to delete it\n`;
        mockedExecuteCommand.mockRejectedValueOnce(new Error(dirtyError));
        mockedShowInformationMessageWithButton.mockResolvedValue(undefined);

        await removeWorktree(workspaceFolder, worktree);

        expect(mockedExecuteCommand).toHaveBeenCalledTimes(1);
        expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
            "git worktree remove -f /worktrees/feature",
            expect.anything()
        );
    });

    it("force-deletes a dirty worktree when the user confirms", async () => {
        const dirtyError = `Command failed: git worktree remove /worktrees/feature\nfatal: '/worktrees/feature' contains modified or untracked files, use --force to delete it\n`;
        mockedExecuteCommand
            .mockRejectedValueOnce(new Error(dirtyError))
            .mockResolvedValue({ stdout: "" });
        mockedShowInformationMessageWithButton.mockResolvedValue("Force Delete");

        await removeWorktree(workspaceFolder, worktree);

        expect(mockedExecuteCommand).toHaveBeenCalledWith(
            "git worktree remove -f /worktrees/feature",
            {
                cwd: workspaceFolder,
            }
        );
        expect(mockedExecuteCommand).toHaveBeenCalledWith("git worktree prune", {
            cwd: workspaceFolder,
        });
    });

    it("throws when force-delete fails", async () => {
        const dirtyError = `Command failed: git worktree remove /worktrees/feature\nfatal: '/worktrees/feature' contains modified or untracked files, use --force to delete it\n`;
        mockedExecuteCommand
            .mockRejectedValueOnce(new Error(dirtyError))
            .mockRejectedValueOnce(new Error("force failed"));
        mockedShowInformationMessageWithButton.mockResolvedValue("Force Delete");

        await expect(removeWorktree(workspaceFolder, worktree)).rejects.toThrow("force failed");
    });
});

describe("pushBranch and pullBranch", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedExecuteCommand.mockResolvedValue({ stdout: "" });
    });

    it("pushes a branch with upstream tracking", async () => {
        await pushBranch("feature", workspaceFolder);

        expect(mockedExecuteCommand).toHaveBeenCalledWith(
            "git push --set-upstream origin feature",
            {
                cwd: workspaceFolder,
            }
        );
    });

    it("pulls inside the worktree path", async () => {
        await pullBranch("/worktrees/feature", workspaceFolder);

        expect(mockedExecuteCommand).toHaveBeenCalledWith("git -C /worktrees/feature pull", {
            cwd: workspaceFolder,
        });
    });
});

describe("addWorktree", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(fs, "existsSync").mockReturnValue(false);
        mockedGetWorktreesDirPath.mockReturnValue("/worktrees");
        mockedGetWorkspaceFilePath.mockReturnValue(undefined);
        mockedHasSubmodules.mockResolvedValue(false);
        mockedCopyWorktreeFiles.mockResolvedValue(undefined as never);
        mockedApplyWorktreeColor.mockResolvedValue(undefined);
        mockedSpawnCommand.mockResolvedValue({ stdout: "" });
        mockShowToplevel();
        (
            helpers as { shouldAutoPushAfterWorktreeCreation: boolean }
        ).shouldAutoPushAfterWorktreeCreation = true;
        (
            helpers as { shouldAutoPullAfterWorktreeCreation: boolean }
        ).shouldAutoPullAfterWorktreeCreation = true;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("creates a new local branch worktree, pushes, and runs post tasks", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(false);

        await addWorktree(workspaceFolder, "main", "new-feature");

        expect(mockedSpawnCommand).toHaveBeenCalledWith(
            "git",
            [
                "worktree",
                "add",
                "--track",
                "-b",
                "new-feature",
                "/worktrees/new-feature",
                "origin/main",
            ],
            { cwd: workspaceFolder }
        );
        expect(mockedExecuteCommand).toHaveBeenCalledWith(
            "git push --set-upstream origin new-feature",
            { cwd: workspaceFolder }
        );
        expect(mockedCopyWorktreeFiles).toHaveBeenCalledWith(
            workspaceFolder,
            "/worktrees/new-feature"
        );
        expect(mockedPullSubmodules).not.toHaveBeenCalled();
    });

    it("skips auto-push when the setting is off", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(false);
        (
            helpers as { shouldAutoPushAfterWorktreeCreation: boolean }
        ).shouldAutoPushAfterWorktreeCreation = false;

        await addNewWorktree(workspaceFolder, "main", "new-feature");

        expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
            expect.stringContaining("git push"),
            expect.anything()
        );
    });

    it("throws when the new branch already exists on the remote", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(true);

        await expect(addNewWorktree(workspaceFolder, "main", "new-feature")).rejects.toThrow(
            "Branch 'new-feature' already exists."
        );
        expect(mockedSpawnCommand).not.toHaveBeenCalled();
    });

    it("checks out an existing remote branch and pulls", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(true);

        await addWorktree(workspaceFolder, "feature", "feature");

        expect(mockedExecuteCommand).toHaveBeenCalledWith(
            "git worktree add /worktrees/feature feature",
            {
                cwd: workspaceFolder,
            }
        );
        expect(mockedExecuteCommand).toHaveBeenCalledWith("git -C /worktrees/feature pull", {
            cwd: workspaceFolder,
        });
    });

    it("skips auto-pull when the setting is off", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(true);
        (
            helpers as { shouldAutoPullAfterWorktreeCreation: boolean }
        ).shouldAutoPullAfterWorktreeCreation = false;

        await addRemoteWorktree(workspaceFolder, "feature", "feature");

        expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
            expect.stringContaining("git -C"),
            expect.anything()
        );
    });

    it("throws when the remote branch does not exist", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(false);

        await expect(addRemoteWorktree(workspaceFolder, "missing", "missing")).rejects.toThrow(
            "Branch 'missing' does not exist."
        );
    });

    it("initializes submodules when the new worktree has them", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(false);
        mockedHasSubmodules.mockResolvedValue(true);

        await addNewWorktree(workspaceFolder, "main", "new-feature");

        expect(mockedPullSubmodules).toHaveBeenCalledWith("/worktrees/new-feature");
    });

    it("passes paths with spaces through spawn argv", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(false);
        mockedGetWorktreesDirPath.mockReturnValue("/home/user/my worktrees");

        await addNewWorktree(workspaceFolder, "main", "new-feature");

        expect(mockedSpawnCommand).toHaveBeenCalledWith(
            "git",
            [
                "worktree",
                "add",
                "--track",
                "-b",
                "new-feature",
                path.join("/home/user/my worktrees", "new-feature"),
                "origin/main",
            ],
            { cwd: workspaceFolder }
        );
    });

    it("throws when creating a new worktree fails", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(false);
        mockedSpawnCommand.mockRejectedValue(new Error("spawn failed"));

        await expect(addNewWorktree(workspaceFolder, "main", "new-feature")).rejects.toThrow(
            "spawn failed"
        );
    });

    it("throws when checking out a remote worktree fails", async () => {
        mockedExistsRemoteBranch.mockResolvedValue(true);
        mockedExecuteCommand.mockRejectedValue(new Error("worktree add failed"));

        await expect(addRemoteWorktree(workspaceFolder, "feature", "feature")).rejects.toThrow(
            "worktree add failed"
        );
    });
});

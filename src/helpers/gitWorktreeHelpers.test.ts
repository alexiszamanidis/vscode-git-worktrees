import * as fs from "fs";
import * as path from "path";
import {
    calculateNewWorktreePath,
    getGitTopLevel,
    getWorktreesList,
    resolvePathInsideWorktree,
} from "./gitWorktreeHelpers";
import * as helpers from "./helpers";
import * as gitHelpers from "./gitHelpers";

jest.mock("vscode");
jest.mock("./helpers", () => ({
    executeCommand: jest.fn(),
    getWorktreesDirPath: jest.fn(() => null),
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
    __esModule: true,
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

const mockedGetWorktreesDirPath = helpers.getWorktreesDirPath as jest.MockedFunction<
    typeof helpers.getWorktreesDirPath
>;
const mockedExecuteCommand = helpers.executeCommand as jest.MockedFunction<
    typeof helpers.executeCommand
>;
const mockedIsBareRepository = gitHelpers.isBareRepository as jest.MockedFunction<
    typeof gitHelpers.isBareRepository
>;

describe("resolvePathInsideWorktree", () => {
    const gitTopLevel = "/repo";
    const worktreePath = "/worktrees/feature-branch";

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it("preserves a monorepo subfolder when it exists in the worktree", () => {
        const pathToPreserve = "/repo/project_f";
        const expected = path.join(worktreePath, "project_f");
        jest.spyOn(fs, "existsSync").mockReturnValue(true);

        const result = resolvePathInsideWorktree(worktreePath, gitTopLevel, pathToPreserve);

        expect(result).toBe(expected);
        expect(fs.existsSync).toHaveBeenCalledWith(expected);
    });

    it("falls back to the worktree root when the subfolder does not exist", () => {
        const pathToPreserve = "/repo/project_f";
        jest.spyOn(fs, "existsSync").mockReturnValue(false);

        const result = resolvePathInsideWorktree(worktreePath, gitTopLevel, pathToPreserve);

        expect(result).toBe(worktreePath);
    });

    it("opens the worktree root when already at the git top level", () => {
        const result = resolvePathInsideWorktree(worktreePath, gitTopLevel, gitTopLevel);

        expect(result).toBe(worktreePath);
    });

    it("preserves a nested .code-workspace path when it exists", () => {
        const pathToPreserve = "/repo/apps/my.code-workspace";
        const expected = path.join(worktreePath, "apps", "my.code-workspace");
        jest.spyOn(fs, "existsSync").mockReturnValue(true);

        const result = resolvePathInsideWorktree(worktreePath, gitTopLevel, pathToPreserve);

        expect(result).toBe(expected);
    });

    it("falls back to the worktree root when path is outside the git top level", () => {
        const pathToPreserve = "/other/project";

        const result = resolvePathInsideWorktree(worktreePath, gitTopLevel, pathToPreserve);

        expect(result).toBe(worktreePath);
    });
});

describe("calculateNewWorktreePath", () => {
    const workspaceFolder = "/home/user/personal-projects/background-images/attack-on-titan";
    const branch = "test-3";

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetWorktreesDirPath.mockReturnValue(null);
        mockedIsBareRepository.mockResolvedValue(false);
    });

    it("places the worktree under {dir}/{branch} when worktrees.dir.path is set", async () => {
        mockedGetWorktreesDirPath.mockReturnValue("/home/user");
        jest.spyOn(fs, "existsSync").mockReturnValue(false);

        const result = await calculateNewWorktreePath(workspaceFolder, branch);

        expect(result).toBe(path.join("/home/user", branch));
    });

    it("places the worktree as a sibling of the main repo when worktrees.dir.path is unset", async () => {
        mockedExecuteCommand.mockResolvedValue({
            stdout: "/home/user/personal-projects/background-images/.git\n",
        });

        const result = await calculateNewWorktreePath(workspaceFolder, branch);

        expect(result).toBe(path.join("/home/user/personal-projects", branch));
    });

    it("throws when the target directory already exists", async () => {
        mockedGetWorktreesDirPath.mockReturnValue("/home/user");
        jest.spyOn(fs, "existsSync").mockReturnValue(true);

        await expect(calculateNewWorktreePath(workspaceFolder, branch)).rejects.toThrow(
            `Directory '${path.join("/home/user", branch)}' already exists.`
        );
    });
});

describe("getWorktreesList", () => {
    it("includes the bare repository when withBareRepo is true", () => {
        const stdout = [
            "/home/user/personal-projects/2022.git  (bare)",
            "/home/user/personal-projects/feature  abc1234 [feature]",
        ].join("\n");

        const worktrees = getWorktreesList(stdout, true);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal-projects/2022.git",
                hash: "",
                worktree: "bare",
            },
            {
                path: "/home/user/personal-projects/feature",
                hash: "abc1234",
                worktree: "feature",
            },
        ]);
    });

    it("excludes the bare repository when withBareRepo is false", () => {
        const stdout = [
            "/home/user/personal-projects/2022.git  (bare)",
            "/home/user/personal-projects/feature  abc1234 [feature]",
        ].join("\n");

        const worktrees = getWorktreesList(stdout, false);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal-projects/feature",
                hash: "abc1234",
                worktree: "feature",
            },
        ]);
    });

    it("includes locked worktrees", () => {
        const stdout = [
            "/home/user/personal-projects/feature  abc1234 [feature]",
            "/home/user/personal-projects/locked   def5678 [locked-branch] locked",
        ].join("\n");

        const worktrees = getWorktreesList(stdout);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal-projects/feature",
                hash: "abc1234",
                worktree: "feature",
            },
            {
                path: "/home/user/personal-projects/locked",
                hash: "def5678",
                worktree: "locked-branch",
            },
        ]);
    });

    it("includes prunable worktrees", () => {
        const stdout = "/home/user/personal-projects/gone  abc1234 [gone] prunable";

        const worktrees = getWorktreesList(stdout);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal-projects/gone",
                hash: "abc1234",
                worktree: "gone",
            },
        ]);
    });

    it("includes a locked bare repository when withBareRepo is true", () => {
        const stdout = "/home/user/personal-projects/2022.git  (bare) locked";

        const worktrees = getWorktreesList(stdout, true);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal-projects/2022.git",
                hash: "",
                worktree: "bare",
            },
        ]);
    });

    it("includes worktrees with a detached HEAD", () => {
        const stdout = "/home/user/personal-projects/detached  abc1234 (detached HEAD)";

        const worktrees = getWorktreesList(stdout);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal-projects/detached",
                hash: "abc1234",
                worktree: "detached HEAD",
            },
        ]);
    });

    it("includes worktrees whose path contains spaces", () => {
        const stdout = "/home/user/personal projects/feature  abc1234 [feature]";

        const worktrees = getWorktreesList(stdout);

        expect(worktrees).toEqual([
            {
                path: "/home/user/personal projects/feature",
                hash: "abc1234",
                worktree: "feature",
            },
        ]);
    });

    it("ignores empty lines", () => {
        const stdout = "/home/user/personal-projects/feature  abc1234 [feature]\n\n";

        const worktrees = getWorktreesList(stdout);

        expect(worktrees).toHaveLength(1);
    });
});

describe("getGitTopLevel", () => {
    const workspaceFolder = "/home/user/personal-projects/2022.git";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns show-toplevel for a normal work tree", async () => {
        mockedExecuteCommand.mockImplementation(async (command: string) => {
            if (command === "git rev-parse --show-toplevel") {
                return { stdout: "/home/user/personal-projects/2022\n" };
            }
            throw new Error(`Unexpected command: ${command}`);
        });

        const result = await getGitTopLevel(workspaceFolder);

        expect(result).toBe("/home/user/personal-projects/2022");
    });

    it("falls back to git-common-dir for a bare repository", async () => {
        mockedExecuteCommand.mockReset();
        mockedExecuteCommand
            .mockRejectedValueOnce(new Error("fatal: this operation must be run in a work tree"))
            .mockResolvedValueOnce({
                stdout: "/home/user/personal-projects/2022.git\n",
            });

        const result = await getGitTopLevel(workspaceFolder);

        expect(result).toBe("/home/user/personal-projects/2022.git");
        expect(mockedExecuteCommand).toHaveBeenCalledTimes(2);
        expect(mockedExecuteCommand).toHaveBeenNthCalledWith(1, "git rev-parse --show-toplevel", {
            cwd: workspaceFolder,
        });
        expect(mockedExecuteCommand).toHaveBeenNthCalledWith(
            2,
            "git rev-parse --path-format=absolute --git-common-dir",
            { cwd: workspaceFolder }
        );
    });
});

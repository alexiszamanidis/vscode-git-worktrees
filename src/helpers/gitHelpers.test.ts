import * as vscode from "vscode";
import {
    existsRemoteBranch,
    fetch,
    getRemoteBranches,
    hasSubmodules,
    isBareRepository,
    isBranchInputValid,
    isBranchNameValid,
    isGitRepository,
    pullSubmodules,
    removeLocalBranchesThatDoNotExistOnRemoteRepository,
    selectBranch,
} from "./gitHelpers";
import * as helpers from "./helpers";
import * as gitWorktreeHelpers from "./gitWorktreeHelpers";
import { BARE_REPOSITORY_REMOTE_ORIGIN_FETCH } from "../constants/constants";

jest.mock("vscode");
jest.mock("./helpers");
jest.mock("./gitWorktreeHelpers", () => ({
    getWorktrees: jest.fn(),
}));
jest.mock("./logger", () => ({
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockedExecuteCommand = helpers.executeCommand as jest.MockedFunction<
    typeof helpers.executeCommand
>;
const mockedSpawnCommand = helpers.spawnCommand as jest.MockedFunction<typeof helpers.spawnCommand>;
const mockedGetWorktrees = gitWorktreeHelpers.getWorktrees as jest.MockedFunction<
    typeof gitWorktreeHelpers.getWorktrees
>;

const workspaceFolder = "/fake/workspace";

describe("gitHelpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("existsRemoteBranch", () => {
        const branch = "feature/test-branch";

        it("should return true if the branch exists remotely", async () => {
            mockedExecuteCommand.mockResolvedValue({
                stdout: "some-commit-hash\trefs/heads/feature/test-branch",
            });

            const result = await existsRemoteBranch(workspaceFolder, branch);

            expect(mockedExecuteCommand).toHaveBeenCalledWith(`git ls-remote origin ${branch}`, {
                cwd: workspaceFolder,
            });
            expect(result).toBe(true);
        });

        it("should return false if the branch does not exist remotely", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            const result = await existsRemoteBranch(workspaceFolder, branch);

            expect(result).toBe(false);
        });

        it("should throw an error if executeCommand fails", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("Git command failed"));

            await expect(existsRemoteBranch(workspaceFolder, branch)).rejects.toThrow(
                "Git command failed"
            );
        });
    });

    describe("selectBranch", () => {
        it("returns the selected branch label", async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: "main" });

            const result = await selectBranch(["main", "feature"]);

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                [{ label: "main" }, { label: "feature" }],
                { matchOnDetail: true, placeHolder: "Select Remote Branch" }
            );
            expect(result).toBe("main");
        });

        it("returns undefined when the user cancels", async () => {
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await expect(selectBranch(["main"])).resolves.toBeUndefined();
        });
    });

    describe("isGitRepository", () => {
        it("returns true for a git work tree", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "true\n" });

            await expect(isGitRepository(workspaceFolder)).resolves.toBe(true);
            expect(mockedExecuteCommand).toHaveBeenCalledWith(
                "git rev-parse --is-inside-work-tree",
                {
                    cwd: workspaceFolder,
                }
            );
        });

        it("returns true for a bare repository when work-tree check fails", async () => {
            mockedExecuteCommand
                .mockRejectedValueOnce(new Error("not a work tree"))
                .mockResolvedValueOnce({ stdout: "true\n" });

            await expect(isGitRepository(workspaceFolder)).resolves.toBe(true);
            expect(mockedExecuteCommand).toHaveBeenNthCalledWith(
                2,
                "git rev-parse --is-bare-repository",
                { cwd: workspaceFolder }
            );
        });

        it("falls through to the bare check when inside-work-tree is false", async () => {
            mockedExecuteCommand
                .mockResolvedValueOnce({ stdout: "false\n" })
                .mockResolvedValueOnce({ stdout: "true\n" });

            await expect(isGitRepository(workspaceFolder)).resolves.toBe(true);
        });

        it("returns false when neither check succeeds", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("not a git repo"));

            await expect(isGitRepository(workspaceFolder)).resolves.toBe(false);
        });
    });

    describe("hasSubmodules", () => {
        it("returns true when submodule status has output", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: " 1234 path (heads/main)" });

            await expect(hasSubmodules("/worktrees/feature")).resolves.toBe(true);
            expect(mockedExecuteCommand).toHaveBeenCalledWith(
                'git -C "/worktrees/feature" submodule status'
            );
        });

        it("returns false when submodule status is empty", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await expect(hasSubmodules("/worktrees/feature")).resolves.toBe(false);
        });

        it("throws when the command fails", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("submodule failed"));

            await expect(hasSubmodules("/worktrees/feature")).rejects.toThrow("submodule failed");
        });
    });

    describe("pullSubmodules", () => {
        it("initializes submodules recursively", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await pullSubmodules("/worktrees/feature");

            expect(mockedExecuteCommand).toHaveBeenCalledWith(
                'git -C "/worktrees/feature" submodule update --init --recursive'
            );
        });

        it("throws when submodule update fails", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("submodule update failed"));

            await expect(pullSubmodules("/worktrees/feature")).rejects.toThrow(
                "submodule update failed"
            );
        });
    });

    describe("getRemoteBranches", () => {
        it("returns origin branches and skips HEAD refs", async () => {
            mockedExecuteCommand.mockResolvedValue({
                stdout: [
                    "  origin/HEAD -> origin/main",
                    "  origin/main",
                    "  origin/feature/test",
                    "  upstream/main",
                    "",
                ].join("\n"),
            });

            const branches = await getRemoteBranches(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledWith("git branch -r", {
                cwd: workspaceFolder,
            });
            expect(branches).toEqual(["main", "feature/test"]);
        });

        it("returns an empty list when there are no remote branches", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await expect(getRemoteBranches(workspaceFolder)).resolves.toEqual([]);
        });

        it("throws when git branch -r fails", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("no remotes"));

            await expect(getRemoteBranches(workspaceFolder)).rejects.toThrow("no remotes");
        });
    });

    describe("isBareRepository", () => {
        it("returns true when git reports a bare repo", async () => {
            mockedSpawnCommand.mockResolvedValue({ stdout: "true\n" });

            await expect(isBareRepository(workspaceFolder, "/repo.git")).resolves.toBe(true);
            expect(mockedSpawnCommand).toHaveBeenCalledWith(
                "git",
                ["-C", "/repo.git", "rev-parse", "--is-bare-repository"],
                { cwd: workspaceFolder }
            );
        });

        it("returns false when git reports a non-bare repo", async () => {
            mockedSpawnCommand.mockResolvedValue({ stdout: "false\n" });

            await expect(isBareRepository(workspaceFolder, "/repo")).resolves.toBe(false);
        });

        it("throws when the spawn command fails", async () => {
            mockedSpawnCommand.mockRejectedValue(new Error("spawn failed"));

            await expect(isBareRepository(workspaceFolder, "/repo")).rejects.toThrow(
                "spawn failed"
            );
        });
    });

    describe("fetch", () => {
        it("fetches without configuring origin when there is no bare repo", async () => {
            mockedGetWorktrees.mockResolvedValue([]);
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await fetch(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledWith("git fetch --all --prune", {
                cwd: workspaceFolder,
            });
            expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
                "git config remote.origin.fetch",
                expect.anything()
            );
        });

        it("skips rewriting origin.fetch when a bare repo already has the right value", async () => {
            mockedGetWorktrees.mockResolvedValue([
                { path: "/repo.git", hash: "", worktree: "bare" },
            ]);
            mockedExecuteCommand.mockImplementation(async (command: string) => {
                if (command === "git config remote.origin.fetch") {
                    return { stdout: `${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}\n` };
                }
                return { stdout: "" };
            });

            await fetch(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledWith("git config remote.origin.fetch", {
                cwd: workspaceFolder,
            });
            expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
                `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`,
                expect.anything()
            );
            expect(mockedExecuteCommand).toHaveBeenCalledWith("git fetch --all --prune", {
                cwd: workspaceFolder,
            });
        });

        it("sets origin.fetch on a bare repo when the value is missing", async () => {
            mockedGetWorktrees.mockResolvedValue([
                { path: "/repo.git", hash: "", worktree: "bare" },
            ]);
            mockedExecuteCommand.mockImplementation(async (command: string) => {
                if (command === "git config remote.origin.fetch") {
                    return { stdout: "refs/heads/main:refs/remotes/origin/main\n" };
                }
                return { stdout: "" };
            });

            await fetch(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledWith(
                `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`,
                { cwd: workspaceFolder }
            );
        });

        it("sets origin.fetch when reading the config fails on a bare repo", async () => {
            mockedGetWorktrees.mockResolvedValue([
                { path: "/repo.git", hash: "", worktree: "bare" },
            ]);
            mockedExecuteCommand.mockImplementation(async (command: string) => {
                if (command === "git config remote.origin.fetch") {
                    throw new Error("not set");
                }
                return { stdout: "" };
            });

            await fetch(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledWith(
                `git config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`,
                { cwd: workspaceFolder }
            );
        });

        it("throws when fetch itself fails", async () => {
            mockedGetWorktrees.mockResolvedValue([]);
            mockedExecuteCommand.mockRejectedValue(new Error("network down"));

            await expect(fetch(workspaceFolder)).rejects.toThrow("network down");
        });

        it("throws when a bare repo cannot set origin.fetch", async () => {
            mockedGetWorktrees.mockResolvedValue([
                { path: "/repo.git", hash: "", worktree: "bare" },
            ]);
            mockedExecuteCommand.mockRejectedValue(new Error("cannot set fetch"));

            await expect(fetch(workspaceFolder)).rejects.toThrow("cannot set fetch");
        });
    });

    describe("removeLocalBranchesThatDoNotExistOnRemoteRepository", () => {
        it("deletes gone local branches except the current branch", async () => {
            mockedExecuteCommand.mockImplementation(async (command: string) => {
                if (command === "git branch -vv") {
                    return {
                        stdout: [
                            "* main abc123 [origin/main] hello",
                            "  stale def456 [origin/stale: gone] old",
                            "* gone-current xyz000 [origin/gone-current: gone] now",
                            "  also-gone jkl000 [origin/also-gone: gone] bye",
                        ].join("\n"),
                    };
                }
                return { stdout: "" };
            });

            await removeLocalBranchesThatDoNotExistOnRemoteRepository(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledWith("git branch -D stale also-gone", {
                cwd: workspaceFolder,
            });
        });

        it("does nothing when stdout is empty", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await removeLocalBranchesThatDoNotExistOnRemoteRepository(workspaceFolder);

            expect(mockedExecuteCommand).toHaveBeenCalledTimes(1);
            expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
                expect.stringContaining("git branch -D"),
                expect.anything()
            );
        });

        it("does nothing when no local branches are gone", async () => {
            mockedExecuteCommand.mockResolvedValue({
                stdout: "* main abc123 [origin/main] hello\n",
            });

            await removeLocalBranchesThatDoNotExistOnRemoteRepository(workspaceFolder);

            expect(mockedExecuteCommand).not.toHaveBeenCalledWith(
                expect.stringContaining("git branch -D"),
                expect.anything()
            );
        });

        it("throws when listing or deleting branches fails", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("branch delete failed"));

            await expect(
                removeLocalBranchesThatDoNotExistOnRemoteRepository(workspaceFolder)
            ).rejects.toThrow("branch delete failed");
        });
    });

    describe("isBranchNameValid and isBranchInputValid", () => {
        it("returns true when git check-ref-format succeeds", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "feature\n" });

            await expect(isBranchNameValid("feature")).resolves.toBe(true);
            expect(mockedExecuteCommand).toHaveBeenCalledWith(
                'git check-ref-format --branch "feature"'
            );
        });

        it("returns false when git check-ref-format fails", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("invalid"));

            await expect(isBranchNameValid("feature..bad")).resolves.toBe(false);
        });

        it("allows an empty input so the remote branch can be reused", async () => {
            await expect(isBranchInputValid!("")).resolves.toBe("");
            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("returns a fatal message for an invalid branch name", async () => {
            mockedExecuteCommand.mockRejectedValue(new Error("invalid"));

            await expect(isBranchInputValid!("feature..bad")).resolves.toBe(
                "fatal: 'feature..bad' is not a valid branch name"
            );
        });

        it("returns an empty string for a valid branch name", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "feature\n" });

            await expect(isBranchInputValid!("feature")).resolves.toBe("");
        });
    });
});

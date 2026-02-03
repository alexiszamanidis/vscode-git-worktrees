import * as fs from "fs";
import * as path from "path";
import {
    parseWorktreeConfig,
    copyInitFiles,
    runLifecycleCommands,
    resolveCommandVariables,
    executeWorktreeAddHooks,
    executeWorktreeRemoveHooks,
    executeWorktreeSwitchHooks,
} from "./worktree-init-helpers";
import * as helpers from "./helpers";

jest.mock("vscode");
jest.mock("./helpers");
jest.mock("./logger", () => ({
    default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    __esModule: true,
}));

const mockedExecuteCommand = helpers.executeCommand as jest.MockedFunction<
    typeof helpers.executeCommand
>;

// Mock fs functions used by the module
jest.mock("fs", () => {
    const actual = jest.requireActual("fs");
    return {
        ...actual,
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        createReadStream: jest.fn(),
        createWriteStream: jest.fn(),
        promises: {
            mkdir: jest.fn().mockResolvedValue(undefined),
        },
    };
});

jest.mock("stream", () => ({
    pipeline: jest.fn((_src, _dest, cb) => cb(null)),
}));

jest.mock("util", () => {
    const actual = jest.requireActual("util");
    return {
        ...actual,
        promisify: jest.fn((fn) => {
            // Return a promisified version that resolves
            return jest.fn().mockResolvedValue(undefined);
        }),
    };
});

const mockedExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

describe("worktree-init-helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("parseWorktreeConfig", () => {
        it("should return null when file does not exist", () => {
            mockedExistsSync.mockReturnValue(false);

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toBeNull();
        });

        it("should parse valid YAML with add and remove sections", () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue(
                "add:\n  copy:\n    - .env\n    - .env.local\n  commands:\n    - yarn install\n    - yarn db:generate\nremove:\n  commands:\n    - tmux kill-session -t test || true\n"
            );

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toEqual({
                add: {
                    copy: [".env", ".env.local"],
                    commands: ["yarn install", "yarn db:generate"],
                },
                remove: {
                    commands: ["tmux kill-session -t test || true"],
                },
            });
        });

        it("should parse YAML with only add.copy section", () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("add:\n  copy:\n    - .env\n");

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toEqual({ add: { copy: [".env"] } });
        });

        it("should parse YAML with only add.commands section", () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("add:\n  commands:\n    - yarn install\n");

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toEqual({ add: { commands: ["yarn install"] } });
        });

        it("should parse YAML with only remove section", () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("remove:\n  commands:\n    - echo cleanup\n");

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toEqual({ remove: { commands: ["echo cleanup"] } });
        });

        it("should return null for invalid YAML", () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockImplementation(() => {
                throw new Error("invalid yaml");
            });

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toBeNull();
        });

        it("should return null for empty file", () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("");

            const result = parseWorktreeConfig("/fake/workspace");

            expect(result).toBeNull();
        });
    });

    describe("resolveCommandVariables", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv, HOME: "/home/testuser" };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it("should replace ${userHome}", () => {
            const result = resolveCommandVariables(
                "echo ${userHome}",
                "/worktrees/feat-x",
                "/workspace/my-repo"
            );
            expect(result).toBe("echo /home/testuser");
        });

        it("should replace ${workspaceFolder} with worktree path", () => {
            const result = resolveCommandVariables(
                "cd ${workspaceFolder}",
                "/worktrees/feat-x",
                "/workspace/my-repo"
            );
            expect(result).toBe("cd /worktrees/feat-x");
        });

        it("should replace ${workspaceFolderBasename} with worktree folder name", () => {
            const result = resolveCommandVariables(
                "echo ${workspaceFolderBasename}",
                "/worktrees/feat-x",
                "/workspace/my-repo"
            );
            expect(result).toBe("echo feat-x");
        });

        it("should replace ${repositoryName} with origin repo name", () => {
            const result = resolveCommandVariables(
                "echo ${repositoryName}",
                "/worktrees/feat-x",
                "/workspace/my-repo"
            );
            expect(result).toBe("echo my-repo");
        });

        it("should replace multiple variables in one command", () => {
            const result = resolveCommandVariables(
                "tmux new-session -d -s ${repositoryName} -n ${workspaceFolderBasename} -c ${workspaceFolder}",
                "/worktrees/feat-x",
                "/workspace/my-repo"
            );
            expect(result).toBe("tmux new-session -d -s my-repo -n feat-x -c /worktrees/feat-x");
        });

        it("should return command unchanged when no variables present", () => {
            const result = resolveCommandVariables(
                "yarn install",
                "/worktrees/feat-x",
                "/workspace/my-repo"
            );
            expect(result).toBe("yarn install");
        });
    });

    describe("copyInitFiles", () => {
        it("should skip when no add.copy files configured", async () => {
            await copyInitFiles({ add: { commands: ["yarn install"] } }, "/source", "/target");

            expect(mockedExistsSync).not.toHaveBeenCalled();
        });

        it("should skip when config has no add section", async () => {
            await copyInitFiles({ remove: { commands: ["echo bye"] } }, "/source", "/target");

            expect(mockedExistsSync).not.toHaveBeenCalled();
        });

        it("should skip missing source files with warning", async () => {
            mockedExistsSync.mockReturnValue(false);

            await copyInitFiles({ add: { copy: [".env"] } }, "/source", "/target");

            expect(mockedExistsSync).toHaveBeenCalledWith(path.join("/source", ".env"));
        });
    });

    describe("runLifecycleCommands", () => {
        it("should skip when commands array is empty", async () => {
            await runLifecycleCommands([], "/worktree", "/workspace", "Test");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("should run commands sequentially in correct cwd with variable substitution", async () => {
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await runLifecycleCommands(
                ["yarn install", "yarn db:generate"],
                "/worktree",
                "/workspace",
                "Running worktree add hooks"
            );

            expect(mockedExecuteCommand).toHaveBeenCalledTimes(2);
            expect(mockedExecuteCommand).toHaveBeenNthCalledWith(1, "yarn install", {
                cwd: "/worktree",
            });
            expect(mockedExecuteCommand).toHaveBeenNthCalledWith(2, "yarn db:generate", {
                cwd: "/worktree",
            });
        });

        it("should continue running remaining commands when one fails", async () => {
            mockedExecuteCommand
                .mockRejectedValueOnce(new Error("command failed"))
                .mockResolvedValueOnce({ stdout: "" });

            await runLifecycleCommands(
                ["bad-command", "yarn install"],
                "/worktree",
                "/workspace",
                "Running worktree add hooks"
            );

            expect(mockedExecuteCommand).toHaveBeenCalledTimes(2);
        });

        it("should show progress with correct title", async () => {
            const vscode = require("vscode");
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await runLifecycleCommands(
                ["yarn install"],
                "/worktree",
                "/workspace",
                "Running worktree remove hooks"
            );

            expect(vscode.window.withProgress).toHaveBeenCalledWith(
                expect.objectContaining({
                    location: vscode.ProgressLocation.Notification,
                    title: "Running worktree remove hooks",
                }),
                expect.any(Function)
            );
        });
    });

    describe("executeWorktreeAddHooks", () => {
        it("should silently skip when no config file exists", async () => {
            mockedExistsSync.mockReturnValue(false);

            await executeWorktreeAddHooks("/workspace", "/new-worktree");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("should parse config and run add commands when config exists", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("add:\n  commands:\n    - yarn install\n");
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await executeWorktreeAddHooks("/workspace", "/new-worktree");

            expect(mockedExecuteCommand).toHaveBeenCalledWith("yarn install", {
                cwd: "/new-worktree",
            });
        });

        it("should skip commands when config has no add section", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("remove:\n  commands:\n    - echo bye\n");

            await executeWorktreeAddHooks("/workspace", "/new-worktree");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });
    });

    describe("executeWorktreeRemoveHooks", () => {
        it("should silently skip when no config file exists", async () => {
            mockedExistsSync.mockReturnValue(false);

            await executeWorktreeRemoveHooks("/workspace", "/worktree");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("should run remove commands when config exists", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("remove:\n  commands:\n    - echo cleanup\n");
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await executeWorktreeRemoveHooks("/workspace", "/worktree");

            expect(mockedExecuteCommand).toHaveBeenCalledWith("echo cleanup", {
                cwd: "/worktree",
            });
        });

        it("should skip when config has no remove section", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("add:\n  commands:\n    - yarn install\n");

            await executeWorktreeRemoveHooks("/workspace", "/worktree");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("should not block on failure", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("remove:\n  commands:\n    - failing-cmd\n");
            mockedExecuteCommand.mockRejectedValue(new Error("cmd failed"));

            // Should not throw
            await executeWorktreeRemoveHooks("/workspace", "/worktree");
        });
    });

    describe("executeWorktreeSwitchHooks", () => {
        it("should silently skip when no config file exists", async () => {
            mockedExistsSync.mockReturnValue(false);

            await executeWorktreeSwitchHooks("/workspace", "/worktree");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("should run switch commands when config exists", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("switch:\n  commands:\n    - echo switching\n");
            mockedExecuteCommand.mockResolvedValue({ stdout: "" });

            await executeWorktreeSwitchHooks("/workspace", "/worktree");

            expect(mockedExecuteCommand).toHaveBeenCalledWith("echo switching", {
                cwd: "/worktree",
            });
        });

        it("should skip when config has no switch section", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("add:\n  commands:\n    - yarn install\n");

            await executeWorktreeSwitchHooks("/workspace", "/worktree");

            expect(mockedExecuteCommand).not.toHaveBeenCalled();
        });

        it("should not block on failure", async () => {
            mockedExistsSync.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("switch:\n  commands:\n    - failing-cmd\n");
            mockedExecuteCommand.mockRejectedValue(new Error("cmd failed"));

            // Should not throw
            await executeWorktreeSwitchHooks("/workspace", "/worktree");
        });
    });
});

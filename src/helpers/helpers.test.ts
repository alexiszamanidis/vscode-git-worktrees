import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import * as util from "util";
import * as helpers from "./helpers";
import {
    applyWorktreeColor,
    copyToClipboard,
    copyWorktreeFiles,
    executeCommand,
    getCurrentPath,
    getWorktreesDirPath,
    getWorkspaceFilePath,
    isMajorUpdate,
    openBrowser,
    resolvePathVariables,
    shouldPreserveSubfolderOnWorktreeSwitch,
    showWhatsNew,
    spawnCommand,
    worktreeCopyIncludePatterns,
} from "./helpers";
import * as vsCodeHelpers from "./vsCodeHelpers";
import logger from "./logger";
import { DEMO_URL, EXTENSION_ID } from "../constants/constants";

jest.mock("vscode");
jest.mock("./vsCodeHelpers", () => ({
    showInformationMessageWithButton: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showErrorMessageWithButton: jest.fn(),
    getWorkspaceFolder: jest.fn(),
    getUserInput: jest.fn(),
}));
jest.mock("./logger", () => ({
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockedShowInformationMessageWithButton =
    vsCodeHelpers.showInformationMessageWithButton as jest.MockedFunction<
        typeof vsCodeHelpers.showInformationMessageWithButton
    >;

describe("isMajorUpdate", () => {
    it("returns true when previous version has no dot", () => {
        expect(isMajorUpdate("2", "2.1.0")).toBe(true);
    });

    it("returns true when the major version increased", () => {
        expect(isMajorUpdate("1.9.0", "2.0.0")).toBe(true);
    });

    it("returns false for minor and patch updates", () => {
        expect(isMajorUpdate("2.0.0", "2.1.0")).toBe(false);
        expect(isMajorUpdate("2.1.0", "2.1.1")).toBe(false);
    });
});

describe("resolvePathVariables", () => {
    it("returns null when the configured path is null", () => {
        expect(resolvePathVariables(null)).toBeNull();
    });

    it("replaces ${userHome} with the home directory", () => {
        expect(resolvePathVariables("${userHome}/worktrees")).toBe(
            path.join(os.homedir(), "worktrees")
        );
    });

    it("leaves paths without variables unchanged", () => {
        expect(resolvePathVariables("/tmp/worktrees")).toBe("/tmp/worktrees");
    });
});

describe("settings helpers", () => {
    it("reads preserve-subfolder from configuration at call time", () => {
        const get = jest.fn().mockReturnValue(false);
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get,
            update: jest.fn(),
        });

        expect(shouldPreserveSubfolderOnWorktreeSwitch()).toBe(false);
        expect(get).toHaveBeenCalledWith("vsCodeGitWorktrees.move.preserveSubfolder", true);
    });

    it("expands ${userHome} in the worktrees directory path", () => {
        const get = jest.fn().mockReturnValue("${userHome}/wt");
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get,
            update: jest.fn(),
        });

        expect(getWorktreesDirPath()).toBe(path.join(os.homedir(), "wt"));
    });

    it("returns the workspace root and workspace file from vscode", () => {
        (vscode.workspace as { rootPath: string }).rootPath = "/repo";
        (vscode.workspace as { workspaceFile: { fsPath: string } }).workspaceFile = {
            fsPath: "/repo/app.code-workspace",
        };

        expect(getCurrentPath()).toBe("/repo");
        expect(getWorkspaceFilePath()).toEqual({ fsPath: "/repo/app.code-workspace" });
    });
});

describe("executeCommand", () => {
    it("returns stdout from a successful command", async () => {
        const { stdout } = await executeCommand("printf hello");

        expect(stdout).toBe("hello");
    });

    it("passes cwd through to the child process", async () => {
        const { stdout } = await executeCommand("pwd", { cwd: os.tmpdir() });

        expect(stdout.trim()).toBe(fs.realpathSync(os.tmpdir()));
    });

    it("wraps the failing command and original error", async () => {
        await expect(executeCommand("false")).rejects.toThrow(/command: 'false'/);
    });
});

describe("spawnCommand", () => {
    it("returns stdout without using a shell", async () => {
        const { stdout } = await spawnCommand("printf", ["hello"]);

        expect(stdout).toBe("hello");
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("printf hello"));
    });

    it("quotes arguments with spaces in the log line only", async () => {
        await spawnCommand("printf", ["hello world"]);

        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('"hello world"'));
    });

    it("escapes quotes in the log line", async () => {
        await spawnCommand("printf", ['say "hi"']);

        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('\\"'));
    });

    it("includes cwd in the log line", async () => {
        await spawnCommand("printf", ["hello"], { cwd: os.tmpdir() });

        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(`cwd: ${os.tmpdir()}`));
    });

    it("uses default empty args when none are provided", async () => {
        const { stdout } = await spawnCommand("true");

        expect(stdout).toBe("");
    });

    it("rejects with stderr when the process exits non-zero", async () => {
        await expect(
            spawnCommand("node", ["-e", "console.error('boom'); process.exit(1)"])
        ).rejects.toThrow(/stderr:\nboom/);
    });

    it("rejects with stdout when the process exits non-zero", async () => {
        await expect(
            spawnCommand("node", ["-e", "process.stdout.write('out'); process.exit(2)"])
        ).rejects.toThrow(/stdout:\nout/);
    });

    it("rejects when the binary cannot be spawned", async () => {
        await expect(spawnCommand("gwt-no-such-binary-xyz")).rejects.toThrow();
    });
});

describe("copyToClipboard", () => {
    it("writes the inspected string to the clipboard", async () => {
        await copyToClipboard("boom");

        expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining("boom")
        );
    });

    it("writes an empty string when no content is provided", async () => {
        await copyToClipboard();

        expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(util.inspect(""));
    });
});

describe("openBrowser", () => {
    const originalPlatform = process.platform;

    const mockExec = () => {
        const cp = require("child_process") as typeof import("child_process");
        return jest.spyOn(cp, "exec").mockImplementation(((_cmd: string, cb?: any) => {
            if (typeof cb === "function") cb(null, "", "");
            return {} as never;
        }) as unknown as typeof cp.exec);
    };

    const setPlatform = (value: NodeJS.Platform) => {
        Object.defineProperty(process, "platform", {
            configurable: true,
            enumerable: true,
            writable: true,
            value,
        });
    };

    afterEach(() => {
        setPlatform(originalPlatform);
    });

    it("uses xdg-open on linux", async () => {
        setPlatform("linux");
        const execSpy = mockExec();

        await openBrowser("https://example.com");

        expect(execSpy).toHaveBeenCalledWith("xdg-open https://example.com");
        execSpy.mockRestore();
    });

    it("uses open on darwin", async () => {
        setPlatform("darwin");
        const execSpy = mockExec();

        await openBrowser("https://example.com");

        expect(execSpy).toHaveBeenCalledWith("open https://example.com");
        execSpy.mockRestore();
    });

    it("uses start on win32", async () => {
        setPlatform("win32");
        const execSpy = mockExec();

        await openBrowser("https://example.com");

        expect(execSpy).toHaveBeenCalledWith("start https://example.com");
        execSpy.mockRestore();
    });

    it("opens an empty url when none is provided", async () => {
        setPlatform("linux");
        const execSpy = mockExec();

        await openBrowser();

        expect(execSpy).toHaveBeenCalledWith("xdg-open ");
        execSpy.mockRestore();
    });
});

describe("copyWorktreeFiles", () => {
    afterEach(() => {
        (worktreeCopyIncludePatterns as string[]).length = 0;
        (vscode.workspace.findFiles as jest.Mock).mockReset();
    });

    it("is a no-op when include patterns are empty", async () => {
        await copyWorktreeFiles("/src", "/dest");

        expect(vscode.workspace.findFiles).not.toHaveBeenCalled();
    });

    it("throws when finding files fails", async () => {
        (worktreeCopyIncludePatterns as string[]).push(".env");
        (vscode.workspace.findFiles as jest.Mock).mockRejectedValue(new Error("find failed"));

        await expect(copyWorktreeFiles("/src", "/dest")).rejects.toThrow("find failed");
    });
});

describe("applyWorktreeColor", () => {
    afterEach(() => {
        (helpers as { shouldColorWorktrees: boolean }).shouldColorWorktrees = false;
    });

    it("is a no-op when coloring is disabled", async () => {
        const worktreePath = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-color-off-"));

        try {
            await applyWorktreeColor(worktreePath);
            expect(fs.existsSync(path.join(worktreePath, ".vscode"))).toBe(false);
        } finally {
            fs.rmSync(worktreePath, { recursive: true, force: true });
        }
    });

    it("creates settings with a random activityBar color", async () => {
        (helpers as { shouldColorWorktrees: boolean }).shouldColorWorktrees = true;
        const worktreePath = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-color-on-mod-"));

        try {
            await applyWorktreeColor(worktreePath);
            const settings = JSON.parse(
                fs.readFileSync(path.join(worktreePath, ".vscode", "settings.json"), "utf8")
            );
            expect(settings["workbench.colorCustomizations"]["activityBar.background"]).toMatch(
                /^#[0-9A-F]{6}$/i
            );
        } finally {
            fs.rmSync(worktreePath, { recursive: true, force: true });
        }
    });

    it("preserves other color customizations when activityBar is missing", async () => {
        (helpers as { shouldColorWorktrees: boolean }).shouldColorWorktrees = true;
        const worktreePath = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-color-merge-"));
        fs.mkdirSync(path.join(worktreePath, ".vscode"));
        fs.writeFileSync(
            path.join(worktreePath, ".vscode", "settings.json"),
            JSON.stringify({
                "workbench.colorCustomizations": { "statusBar.background": "#111111" },
            })
        );

        try {
            await applyWorktreeColor(worktreePath);
            const settings = JSON.parse(
                fs.readFileSync(path.join(worktreePath, ".vscode", "settings.json"), "utf8")
            );
            expect(settings["workbench.colorCustomizations"]["statusBar.background"]).toBe(
                "#111111"
            );
            expect(settings["workbench.colorCustomizations"]["activityBar.background"]).toMatch(
                /^#[0-9A-F]{6}$/i
            );
        } finally {
            fs.rmSync(worktreePath, { recursive: true, force: true });
        }
    });
});

describe("showWhatsNew", () => {
    const context = {
        globalState: {
            get: jest.fn(),
            update: jest.fn(),
        },
    } as unknown as vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        (vscode.extensions.getExtension as jest.Mock).mockReturnValue({
            packageJSON: { version: "2.0.0" },
        });
        mockedShowInformationMessageWithButton.mockResolvedValue(undefined);
    });

    it("shows the demo prompt on first install", async () => {
        (context.globalState.get as jest.Mock).mockReturnValue(undefined);

        await showWhatsNew(context);

        expect(context.globalState.update).toHaveBeenCalledWith(EXTENSION_ID, "2.0.0");
        expect(mockedShowInformationMessageWithButton).toHaveBeenCalled();
    });

    it("shows the demo prompt on a major update", async () => {
        (context.globalState.get as jest.Mock).mockReturnValue("1.0.0");
        mockedShowInformationMessageWithButton.mockResolvedValue("View Demo");
        const cp = require("child_process") as typeof import("child_process");
        const execSpy = jest.spyOn(cp, "exec").mockImplementation(((_cmd: string, cb?: any) => {
            if (typeof cb === "function") cb(null, "", "");
            return {} as never;
        }) as unknown as typeof cp.exec);

        await showWhatsNew(context);

        expect(mockedShowInformationMessageWithButton).toHaveBeenCalled();
        expect(execSpy).toHaveBeenCalledWith(expect.stringContaining(DEMO_URL));
        execSpy.mockRestore();
    });

    it("skips the prompt on a minor update", async () => {
        (context.globalState.get as jest.Mock).mockReturnValue("2.0.0");
        (vscode.extensions.getExtension as jest.Mock).mockReturnValue({
            packageJSON: { version: "2.1.0" },
        });

        await showWhatsNew(context);

        expect(mockedShowInformationMessageWithButton).not.toHaveBeenCalled();
    });

    it("does not throw when the extension lookup fails", async () => {
        (context.globalState.get as jest.Mock).mockReturnValue("1.0.0");
        (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
        const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

        await expect(showWhatsNew(context)).resolves.toBeUndefined();
        logSpy.mockRestore();
    });
});

describe("helpers with reloaded settings", () => {
    it("copies matched files into the worktree", async () => {
        const sourceRepo = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-copy-src-"));
        const targetWorktree = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-copy-dst-"));
        fs.mkdirSync(path.join(sourceRepo, "nested"));
        fs.writeFileSync(path.join(sourceRepo, "nested", ".env"), "SECRET=1");

        jest.resetModules();
        jest.doMock("./logger", () => ({
            default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.doMock("./vsCodeHelpers", () => ({
            showInformationMessageWithButton: jest.fn(),
        }));
        const vscodeMock = require("vscode");
        vscodeMock.workspace.getConfiguration.mockReturnValue({
            get: (key: string, defaultValue: unknown) => {
                if (key === "vsCodeGitWorktrees.worktreeCopyIncludePatterns") return [".env"];
                if (key === "vsCodeGitWorktrees.worktreeCopyExcludePatterns") return [];
                return defaultValue;
            },
            update: jest.fn(),
        });
        vscodeMock.workspace.findFiles.mockResolvedValue([
            { fsPath: path.join(sourceRepo, "nested", ".env") },
        ]);

        try {
            const { copyWorktreeFiles: copyFiles } = require("./helpers");
            await copyFiles(sourceRepo, targetWorktree);
            expect(fs.readFileSync(path.join(targetWorktree, "nested", ".env"), "utf8")).toBe(
                "SECRET=1"
            );
        } finally {
            fs.rmSync(sourceRepo, { recursive: true, force: true });
            fs.rmSync(targetWorktree, { recursive: true, force: true });
        }
    });

    it("writes an activityBar color when coloring is enabled", async () => {
        const worktreePath = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-color-on-"));

        jest.resetModules();
        jest.doMock("./logger", () => ({
            default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.doMock("./vsCodeHelpers", () => ({
            showInformationMessageWithButton: jest.fn(),
        }));
        const vscodeMock = require("vscode");
        vscodeMock.workspace.getConfiguration.mockReturnValue({
            get: (key: string, defaultValue: unknown) => {
                if (key === "vsCodeGitWorktrees.worktree.coloring") return true;
                return defaultValue;
            },
            update: jest.fn(),
        });

        try {
            const { applyWorktreeColor: applyColor } = require("./helpers");
            await applyColor(worktreePath);

            const settingsPath = path.join(worktreePath, ".vscode", "settings.json");
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            expect(settings["workbench.colorCustomizations"]["activityBar.background"]).toMatch(
                /^#[0-9A-F]{6}$/i
            );

            const firstColor = settings["workbench.colorCustomizations"]["activityBar.background"];
            await applyColor(worktreePath);
            const unchanged = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
            expect(unchanged["workbench.colorCustomizations"]["activityBar.background"]).toBe(
                firstColor
            );
        } finally {
            fs.rmSync(worktreePath, { recursive: true, force: true });
        }
    });

    it("recovers from invalid existing settings.json when coloring", async () => {
        const worktreePath = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-color-bad-"));
        fs.mkdirSync(path.join(worktreePath, ".vscode"));
        fs.writeFileSync(path.join(worktreePath, ".vscode", "settings.json"), "{not json");

        jest.resetModules();
        jest.doMock("./logger", () => ({
            default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.doMock("./vsCodeHelpers", () => ({
            showInformationMessageWithButton: jest.fn(),
        }));
        const vscodeMock = require("vscode");
        vscodeMock.workspace.getConfiguration.mockReturnValue({
            get: (key: string, defaultValue: unknown) => {
                if (key === "vsCodeGitWorktrees.worktree.coloring") return true;
                return defaultValue;
            },
            update: jest.fn(),
        });

        try {
            const { applyWorktreeColor: applyColor } = require("./helpers");
            await applyColor(worktreePath);
            const settings = JSON.parse(
                fs.readFileSync(path.join(worktreePath, ".vscode", "settings.json"), "utf8")
            );
            expect(settings["workbench.colorCustomizations"]["activityBar.background"]).toMatch(
                /^#[0-9A-F]{6}$/i
            );
        } finally {
            fs.rmSync(worktreePath, { recursive: true, force: true });
        }
    });
});

import * as vscode from "vscode";
import { activate, deactivate } from "./extension";
import gitWorktreeList from "./git/operations/worktree/gitWorktreeList";
import gitWorktreeRemove from "./git/operations/worktree/gitWorktreeRemove";
import gitWorktreeAdd from "./git/operations/worktree/gitWorktreeAdd";
import { showWhatsNew } from "./helpers/helpers";
import logger from "./helpers/logger";

jest.mock("vscode");
jest.mock("./git/operations/worktree/gitWorktreeList", () => ({
    default: jest.fn(),
}));
jest.mock("./git/operations/worktree/gitWorktreeRemove", () => ({
    default: jest.fn(),
}));
jest.mock("./git/operations/worktree/gitWorktreeAdd", () => ({
    default: jest.fn(),
}));
jest.mock("./helpers/helpers", () => ({
    showWhatsNew: jest.fn(),
}));
jest.mock("./helpers/logger", () => ({
    default: {
        toggle: jest.fn(),
        dispose: jest.fn(),
    },
}));

const getRegisteredCallback = (command: string) => {
    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        ([registered]: [string]) => registered === command
    );
    return call?.[1] as () => Promise<void> | void;
};

describe("extension", () => {
    const context = {
        subscriptions: [] as { dispose: () => void }[],
    } as unknown as vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        context.subscriptions.length = 0;
        (gitWorktreeList as jest.Mock).mockResolvedValue(undefined);
        (gitWorktreeRemove as jest.Mock).mockResolvedValue(undefined);
        (gitWorktreeAdd as jest.Mock).mockResolvedValue(undefined);
    });

    it("registers the four commands, logger, and shows whats-new", () => {
        activate(context);

        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            "git-worktrees.worktree.list",
            expect.any(Function)
        );
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            "git-worktrees.worktree.remove",
            expect.any(Function)
        );
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            "git-worktrees.worktree.add",
            expect.any(Function)
        );
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
            "git-worktrees.worktree.toggleLogs",
            expect.any(Function)
        );
        expect(context.subscriptions).toHaveLength(5);
        expect(showWhatsNew).toHaveBeenCalledWith(context);
    });

    it("delegates list, remove, add, and toggle to the operation modules", async () => {
        activate(context);

        await getRegisteredCallback("git-worktrees.worktree.list")();
        await getRegisteredCallback("git-worktrees.worktree.remove")();
        await getRegisteredCallback("git-worktrees.worktree.add")();
        getRegisteredCallback("git-worktrees.worktree.toggleLogs")();

        expect(gitWorktreeList).toHaveBeenCalledTimes(1);
        expect(gitWorktreeRemove).toHaveBeenCalledTimes(1);
        expect(gitWorktreeAdd).toHaveBeenCalledTimes(1);
        expect(logger.toggle).toHaveBeenCalledTimes(1);
    });

    it("deactivate does not throw", () => {
        expect(() => deactivate()).not.toThrow();
    });
});

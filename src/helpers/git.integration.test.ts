import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import {
    existsWorktree,
    getGitTopLevel,
    getWorktrees,
    removeWorktree,
    calculateNewWorktreePath,
} from "./gitWorktreeHelpers";
import {
    existsRemoteBranch,
    getRemoteBranches,
    isBranchNameValid,
    isGitRepository,
} from "./gitHelpers";

jest.mock("vscode");
jest.mock("./vsCodeHelpers", () => ({
    showInformationMessage: jest.fn(),
    showInformationMessageWithButton: jest.fn(),
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

const git = (cwd: string, command: string) =>
    execSync(command, { cwd, stdio: "pipe", encoding: "utf8" });

const createGitRepo = (dirName?: string) => {
    const dir = dirName ? dirName : fs.mkdtempSync(path.join(os.tmpdir(), "gwt-int-"));
    fs.mkdirSync(dir, { recursive: true });
    git(dir, "git init -b main");
    git(dir, 'git config user.email "test@example.com"');
    git(dir, 'git config user.name "Test"');
    git(dir, "git config commit.gpgsign false");
    fs.writeFileSync(path.join(dir, "README.md"), "hello\n");
    git(dir, "git add README.md");
    git(dir, 'git commit -m "init"');
    return dir;
};

describe("real git integration", () => {
    const cleanup: string[] = [];

    afterEach(() => {
        while (cleanup.length > 0) {
            const dir = cleanup.pop();
            if (dir) fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it("detects git and non-git directories", async () => {
        const repo = createGitRepo();
        const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-not-git-"));
        cleanup.push(repo, notRepo);

        await expect(isGitRepository(repo)).resolves.toBe(true);
        await expect(isGitRepository(notRepo)).resolves.toBe(false);
    });

    it("resolves the git top level from a subfolder", async () => {
        const repo = createGitRepo();
        const nested = path.join(repo, "packages", "app");
        fs.mkdirSync(nested, { recursive: true });
        cleanup.push(repo);

        await expect(getGitTopLevel(nested)).resolves.toBe(repo);
    });

    it("lists worktrees and detects existing ones", async () => {
        const repo = createGitRepo();
        const worktree = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-wt-"));
        fs.rmSync(worktree, { recursive: true, force: true });
        git(repo, `git worktree add -b feature "${worktree}"`);
        cleanup.push(worktree, repo);

        const worktrees = await getWorktrees({ workspaceFolder: repo });
        expect(worktrees.some((wt) => wt.worktree === "feature")).toBe(true);
        await expect(existsWorktree(repo, "feature")).resolves.toBe(true);
        await expect(existsWorktree(repo, "does-not-exist")).resolves.toBe(false);
    });

    it("removes a linked worktree", async () => {
        const repo = createGitRepo();
        const worktree = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-wt-rm-"));
        fs.rmSync(worktree, { recursive: true, force: true });
        git(repo, `git worktree add -b feature "${worktree}"`);
        cleanup.push(worktree, repo);

        await removeWorktree(repo, { label: "feature", detail: worktree });

        await expect(existsWorktree(repo, "feature")).resolves.toBe(false);
    });

    it("validates branch names with git check-ref-format", async () => {
        const repo = createGitRepo();
        cleanup.push(repo);

        await expect(isBranchNameValid("feature/ok")).resolves.toBe(true);
        await expect(isBranchNameValid("feature..bad")).resolves.toBe(false);
    });

    it("lists remote branches and checks existence", async () => {
        const repo = createGitRepo();
        const bare = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-bare-"));
        fs.rmSync(bare, { recursive: true, force: true });
        git(repo, `git clone --bare "${repo}" "${bare}"`);
        git(repo, `git remote add origin "${bare}"`);
        git(repo, "git fetch origin");
        cleanup.push(bare, repo);

        const branches = await getRemoteBranches(repo);
        expect(branches).toContain("main");
        await expect(existsRemoteBranch(repo, "main")).resolves.toBe(true);
        await expect(existsRemoteBranch(repo, "missing-branch")).resolves.toBe(false);
    });

    it("calculates a sibling worktree path from a real repo", async () => {
        const repo = createGitRepo();
        cleanup.push(repo);

        const newPath = await calculateNewWorktreePath(repo, "new-feature");
        expect(newPath).toBe(path.join(path.dirname(repo), "new-feature"));
    });

    it("handles a repository path that contains spaces", async () => {
        const parent = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-space-"));
        const repo = path.join(parent, "my repo");
        createGitRepo(repo);
        cleanup.push(parent);

        await expect(isGitRepository(repo)).resolves.toBe(true);
        await expect(getGitTopLevel(repo)).resolves.toBe(repo);
    });

    it("detects a bare repository", async () => {
        const repo = createGitRepo();
        const bare = fs.mkdtempSync(path.join(os.tmpdir(), "gwt-bare2-"));
        fs.rmSync(bare, { recursive: true, force: true });
        git(repo, `git clone --bare "${repo}" "${bare}"`);
        cleanup.push(bare, repo);

        await expect(isGitRepository(bare)).resolves.toBe(true);
        await expect(getGitTopLevel(bare)).resolves.toBe(bare);
    });
});

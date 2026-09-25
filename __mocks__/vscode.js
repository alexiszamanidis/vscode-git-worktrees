const outputChannel = {
    appendLine: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
};

const defaultSettings = {
    "vsCodeGitWorktrees.remove.stalledBranches": false,
    "vsCodeGitWorktrees.worktree.coloring": false,
    "vsCodeGitWorktrees.move.openNewVscodeWindow": true,
    "vsCodeGitWorktrees.move.preserveSubfolder": true,
    "vsCodeGitWorktrees.worktrees.dir.path": null,
    "vsCodeGitWorktrees.add.autoPush": true,
    "vsCodeGitWorktrees.add.autoPull": true,
    "vsCodeGitWorktrees.worktreeCopyIncludePatterns": [],
    "vsCodeGitWorktrees.worktreeCopyExcludePatterns": [],
    "vsCodeGitWorktrees.worktreeSearchPath": null,
};

const vscode = {
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showQuickPick: jest.fn(),
        showInputBox: jest.fn(),
        createOutputChannel: jest.fn(() => outputChannel),
    },
    workspace: {
        workspaceFolders: [],
        workspaceFile: undefined,
        rootPath: undefined,
        findFiles: jest.fn(),
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key, defaultValue) =>
                Object.prototype.hasOwnProperty.call(defaultSettings, key)
                    ? defaultSettings[key]
                    : defaultValue
            ),
            update: jest.fn(),
        })),
    },
    commands: {
        executeCommand: jest.fn(),
        registerCommand: jest.fn((command, callback) => ({
            command,
            callback,
            dispose: jest.fn(),
        })),
    },
    env: {
        clipboard: {
            writeText: jest.fn(),
        },
    },
    extensions: {
        getExtension: jest.fn(),
    },
    Uri: {
        file: jest.fn((fsPath) => ({ fsPath, scheme: "file" })),
    },
    RelativePattern: class RelativePattern {
        constructor(base, pattern) {
            this.base = base;
            this.pattern = pattern;
        }
    },
};

module.exports = vscode;

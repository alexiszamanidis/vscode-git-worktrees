const vscode = {
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn(),
        })),
        withProgress: jest.fn((options, task) => {
            const progress = { report: jest.fn() };
            const token = { isCancellationRequested: false };
            return task(progress, token);
        }),
    },
    workspace: {
        workspaceFolders: [],
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
    },
    ProgressLocation: {
        Notification: 15,
    },
};

module.exports = vscode;

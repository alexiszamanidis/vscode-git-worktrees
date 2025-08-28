const vscode = {
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn(),
        })),
    },
    workspace: {
        workspaceFolders: [],
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
    },
};

module.exports = vscode;

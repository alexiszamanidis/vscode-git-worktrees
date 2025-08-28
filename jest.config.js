module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^vscode$": "<rootDir>/__mocks__/vscode.js",
    },
    roots: ["<rootDir>/src"],
};

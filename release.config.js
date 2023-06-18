const config = {
    branches: ["master"],
    plugins: [
        ["@semantic-release/commit-analyzer"],
        ["@semantic-release/release-notes-generator"],
        [
            "@semantic-release/changelog",
            {
                changelogFile: "CHANGELOG.md",
            },
        ],
        [
            "@semantic-release/npm",
            {
                npmPublish: false,
            },
        ],
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "package-lock.json", "CHANGELOG.md"],
            },
        ],
        "@semantic-release/github",
    ],
};

module.exports = config;

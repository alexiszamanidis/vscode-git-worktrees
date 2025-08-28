import { existsRemoteBranch } from "./gitHelpers";
import * as helpers from "./helpers";

jest.mock("vscode");
jest.mock("./helpers");

const mockedExecuteCommand = helpers.executeCommand as jest.MockedFunction<
    typeof helpers.executeCommand
>;

describe("gitHelpers", () => {
    describe("existsRemoteBranch", () => {
        const workspaceFolder = "/fake/workspace";
        const branch = "feature/test-branch";

        beforeEach(() => {
            jest.clearAllMocks();
        });

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
});

import gitWorktreeAdd from "./gitWorktreeAdd";
import { OPEN_ISSUE_URL } from "../../../constants/constants";
import * as gitWorktreeHelpers from "../../../helpers/gitWorktreeHelpers";
import * as gitHelpers from "../../../helpers/gitHelpers";
import * as helpers from "../../../helpers/helpers";
import * as vsCodeHelpers from "../../../helpers/vsCodeHelpers";

jest.mock("vscode");
jest.mock("../../../helpers/gitWorktreeHelpers");
jest.mock("../../../helpers/gitHelpers");
jest.mock("../../../helpers/helpers", () => ({
    copyToClipboard: jest.fn(),
    openBrowser: jest.fn(),
    shouldRemoveStalledBranches: false,
}));
jest.mock("../../../helpers/vsCodeHelpers");
jest.mock("../../../helpers/logger", () => ({
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockedGetWorkspaceFolder = vsCodeHelpers.getWorkspaceFolder as jest.MockedFunction<
    typeof vsCodeHelpers.getWorkspaceFolder
>;
const mockedIsGitRepository = gitHelpers.isGitRepository as jest.MockedFunction<
    typeof gitHelpers.isGitRepository
>;
const mockedFetch = gitHelpers.fetch as jest.MockedFunction<typeof gitHelpers.fetch>;
const mockedGetRemoteBranches = gitHelpers.getRemoteBranches as jest.MockedFunction<
    typeof gitHelpers.getRemoteBranches
>;
const mockedSelectBranch = gitHelpers.selectBranch as jest.MockedFunction<
    typeof gitHelpers.selectBranch
>;
const mockedGetUserInput = vsCodeHelpers.getUserInput as jest.MockedFunction<
    typeof vsCodeHelpers.getUserInput
>;
const mockedExistsWorktree = gitWorktreeHelpers.existsWorktree as jest.MockedFunction<
    typeof gitWorktreeHelpers.existsWorktree
>;
const mockedAddWorktree = gitWorktreeHelpers.addWorktree as jest.MockedFunction<
    typeof gitWorktreeHelpers.addWorktree
>;
const mockedRemoveStalled =
    gitHelpers.removeLocalBranchesThatDoNotExistOnRemoteRepository as jest.MockedFunction<
        typeof gitHelpers.removeLocalBranchesThatDoNotExistOnRemoteRepository
    >;
const mockedShowErrorMessageWithButton =
    vsCodeHelpers.showErrorMessageWithButton as jest.MockedFunction<
        typeof vsCodeHelpers.showErrorMessageWithButton
    >;
const mockedCopyToClipboard = helpers.copyToClipboard as jest.MockedFunction<
    typeof helpers.copyToClipboard
>;
const mockedOpenBrowser = helpers.openBrowser as jest.MockedFunction<typeof helpers.openBrowser>;

const workspaceFolder = "/repo";
const remoteBranches = ["main", "feature"];

describe("gitWorktreeAdd", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (helpers as { shouldRemoveStalledBranches: boolean }).shouldRemoveStalledBranches = false;
        mockedGetWorkspaceFolder.mockResolvedValue(workspaceFolder);
        mockedIsGitRepository.mockResolvedValue(true);
        mockedFetch.mockResolvedValue(undefined as never);
        mockedGetRemoteBranches.mockResolvedValue(remoteBranches);
        mockedSelectBranch.mockResolvedValue("main");
        mockedGetUserInput.mockResolvedValue("new-feature");
        mockedExistsWorktree.mockResolvedValue(false);
        mockedAddWorktree.mockResolvedValue(undefined as never);
        mockedRemoveStalled.mockResolvedValue(undefined as never);
    });

    it("aborts when no workspace folder is found", async () => {
        mockedGetWorkspaceFolder.mockResolvedValue(null);

        await gitWorktreeAdd();

        expect(mockedIsGitRepository).not.toHaveBeenCalled();
        expect(mockedAddWorktree).not.toHaveBeenCalled();
    });

    it("shows an error when the folder is not a git repository", async () => {
        mockedIsGitRepository.mockResolvedValue(false);
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeAdd();

        expect(mockedShowErrorMessageWithButton).toHaveBeenCalledWith({
            errorMessage: "This is not a git repository.",
            buttonName: "Copy Error and Open an Issue",
        });
        expect(mockedAddWorktree).not.toHaveBeenCalled();
    });

    it("fetches remotes before suggesting branches", async () => {
        await gitWorktreeAdd();

        expect(mockedFetch).toHaveBeenCalledWith(workspaceFolder);
        expect(mockedGetRemoteBranches).toHaveBeenCalledWith(workspaceFolder);
        expect(mockedSelectBranch).toHaveBeenCalledWith(remoteBranches);
    });

    it("does not prune stalled branches when the setting is off", async () => {
        await gitWorktreeAdd();

        expect(mockedRemoveStalled).not.toHaveBeenCalled();
    });

    it("prunes stalled branches when the setting is on", async () => {
        (helpers as { shouldRemoveStalledBranches: boolean }).shouldRemoveStalledBranches = true;

        await gitWorktreeAdd();

        expect(mockedRemoveStalled).toHaveBeenCalledWith(workspaceFolder);
    });

    it("aborts when the user cancels remote branch selection", async () => {
        mockedSelectBranch.mockResolvedValue(undefined);

        await gitWorktreeAdd();

        expect(mockedGetUserInput).not.toHaveBeenCalled();
        expect(mockedAddWorktree).not.toHaveBeenCalled();
    });

    it("uses the remote branch name when the user leaves the new branch empty", async () => {
        mockedGetUserInput.mockResolvedValue(undefined);

        await gitWorktreeAdd();

        expect(mockedExistsWorktree).toHaveBeenCalledWith(workspaceFolder, "main");
        expect(mockedAddWorktree).toHaveBeenCalledWith(workspaceFolder, "main", "main");
    });

    it("uses the remote branch name when the user submits an empty string", async () => {
        mockedGetUserInput.mockResolvedValue("");

        await gitWorktreeAdd();

        expect(mockedAddWorktree).toHaveBeenCalledWith(workspaceFolder, "main", "main");
    });

    it("shows an error when the worktree already exists", async () => {
        mockedExistsWorktree.mockResolvedValue(true);
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeAdd();

        expect(mockedShowErrorMessageWithButton).toHaveBeenCalledWith({
            errorMessage: "Worktree 'new-feature' already exists.",
            buttonName: "Copy Error and Open an Issue",
        });
        expect(mockedAddWorktree).not.toHaveBeenCalled();
    });

    it("creates a worktree with the remote and new branch names", async () => {
        await gitWorktreeAdd();

        expect(mockedAddWorktree).toHaveBeenCalledWith(workspaceFolder, "main", "new-feature");
    });

    it("copies the error and opens an issue when the user clicks the error button", async () => {
        mockedAddWorktree.mockRejectedValue(new Error("git exploded"));
        mockedShowErrorMessageWithButton.mockResolvedValue("Copy Error and Open an Issue");

        await gitWorktreeAdd();

        expect(mockedCopyToClipboard).toHaveBeenCalledWith("git exploded");
        expect(mockedOpenBrowser).toHaveBeenCalledWith(OPEN_ISSUE_URL);
    });

    it("does not open an issue when the user dismisses the error dialog", async () => {
        mockedAddWorktree.mockRejectedValue(new Error("git exploded"));
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeAdd();

        expect(mockedCopyToClipboard).not.toHaveBeenCalled();
        expect(mockedOpenBrowser).not.toHaveBeenCalled();
    });
});

import gitWorktreeRemove from "./gitWorktreeRemove";
import { OPEN_ISSUE_URL } from "../../../constants/constants";
import * as gitWorktreeHelpers from "../../../helpers/gitWorktreeHelpers";
import * as gitHelpers from "../../../helpers/gitHelpers";
import * as helpers from "../../../helpers/helpers";
import * as vsCodeHelpers from "../../../helpers/vsCodeHelpers";

jest.mock("vscode");
jest.mock("../../../helpers/gitWorktreeHelpers");
jest.mock("../../../helpers/vsCodeHelpers");
jest.mock("../../../helpers/gitHelpers");
jest.mock("../../../helpers/helpers");
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
const mockedGetWorktree = gitWorktreeHelpers.getWorktree as jest.MockedFunction<
    typeof gitWorktreeHelpers.getWorktree
>;
const mockedRemoveWorktree = gitWorktreeHelpers.removeWorktree as jest.MockedFunction<
    typeof gitWorktreeHelpers.removeWorktree
>;
const mockedShowInformationMessage = vsCodeHelpers.showInformationMessage as jest.MockedFunction<
    typeof vsCodeHelpers.showInformationMessage
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
const selectedWorktree = { label: "feature", detail: "/worktrees/feature" };

describe("gitWorktreeRemove", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetWorkspaceFolder.mockResolvedValue(workspaceFolder);
        mockedIsGitRepository.mockResolvedValue(true);
        mockedGetWorktree.mockResolvedValue(selectedWorktree);
        mockedRemoveWorktree.mockResolvedValue(undefined as never);
        mockedShowInformationMessage.mockResolvedValue(undefined);
    });

    it("aborts when no workspace folder is found", async () => {
        mockedGetWorkspaceFolder.mockResolvedValue(null);

        await gitWorktreeRemove();

        expect(mockedIsGitRepository).not.toHaveBeenCalled();
        expect(mockedRemoveWorktree).not.toHaveBeenCalled();
    });

    it("shows an error when the folder is not a git repository", async () => {
        mockedIsGitRepository.mockResolvedValue(false);
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeRemove();

        expect(mockedShowErrorMessageWithButton).toHaveBeenCalledWith({
            errorMessage: "This is not a git repository.",
            buttonName: "Copy Error and Open an Issue",
        });
        expect(mockedGetWorktree).not.toHaveBeenCalled();
    });

    it("aborts when the user cancels worktree selection", async () => {
        mockedGetWorktree.mockResolvedValue(undefined);

        await gitWorktreeRemove();

        expect(mockedRemoveWorktree).not.toHaveBeenCalled();
        expect(mockedShowInformationMessage).not.toHaveBeenCalled();
    });

    it("removes the selected worktree and shows a success message", async () => {
        await gitWorktreeRemove();

        expect(mockedRemoveWorktree).toHaveBeenCalledWith(workspaceFolder, selectedWorktree);
        expect(mockedShowInformationMessage).toHaveBeenCalledWith(
            "Worktree named 'feature' was removed successfully"
        );
    });

    it("copies the error and opens an issue when the user clicks the error button", async () => {
        mockedRemoveWorktree.mockRejectedValue(new Error("cannot remove"));
        mockedShowErrorMessageWithButton.mockResolvedValue("Copy Error and Open an Issue");

        await gitWorktreeRemove();

        expect(mockedCopyToClipboard).toHaveBeenCalledWith("cannot remove");
        expect(mockedOpenBrowser).toHaveBeenCalledWith(OPEN_ISSUE_URL);
    });

    it("does not open an issue when the user dismisses the error dialog", async () => {
        mockedRemoveWorktree.mockRejectedValue(new Error("cannot remove"));
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeRemove();

        expect(mockedCopyToClipboard).not.toHaveBeenCalled();
        expect(mockedOpenBrowser).not.toHaveBeenCalled();
    });
});

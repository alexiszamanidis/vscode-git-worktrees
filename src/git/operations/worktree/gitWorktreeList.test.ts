import gitWorktreeList from "./gitWorktreeList";
import { OPEN_ISSUE_URL } from "../../../constants/constants";
import * as gitWorktreeHelpers from "../../../helpers/gitWorktreeHelpers";
import * as gitHelpers from "../../../helpers/gitHelpers";
import * as helpers from "../../../helpers/helpers";
import * as vsCodeHelpers from "../../../helpers/vsCodeHelpers";

jest.mock("vscode");
jest.mock("../../../helpers/gitWorktreeHelpers");
jest.mock("../../../helpers/gitHelpers");
jest.mock("../../../helpers/helpers");
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
const mockedGetWorktree = gitWorktreeHelpers.getWorktree as jest.MockedFunction<
    typeof gitWorktreeHelpers.getWorktree
>;
const mockedMoveIntoWorktree = gitWorktreeHelpers.moveIntoWorktree as jest.MockedFunction<
    typeof gitWorktreeHelpers.moveIntoWorktree
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

describe("gitWorktreeList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetWorkspaceFolder.mockResolvedValue(workspaceFolder);
        mockedIsGitRepository.mockResolvedValue(true);
        mockedGetWorktree.mockResolvedValue(selectedWorktree);
        mockedMoveIntoWorktree.mockResolvedValue({ type: "folder", path: selectedWorktree.detail });
    });

    it("aborts when no workspace folder is found", async () => {
        mockedGetWorkspaceFolder.mockResolvedValue(null);

        await gitWorktreeList();

        expect(mockedIsGitRepository).not.toHaveBeenCalled();
        expect(mockedMoveIntoWorktree).not.toHaveBeenCalled();
    });

    it("shows an error when the folder is not a git repository", async () => {
        mockedIsGitRepository.mockResolvedValue(false);
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeList();

        expect(mockedShowErrorMessageWithButton).toHaveBeenCalledWith({
            errorMessage: "This is not a git repository.",
            buttonName: "Copy Error and Open an Issue",
        });
        expect(mockedGetWorktree).not.toHaveBeenCalled();
    });

    it("aborts when the user cancels worktree selection", async () => {
        mockedGetWorktree.mockResolvedValue(undefined);

        await gitWorktreeList();

        expect(mockedMoveIntoWorktree).not.toHaveBeenCalled();
    });

    it("moves into the selected worktree", async () => {
        await gitWorktreeList();

        expect(mockedGetWorktree).toHaveBeenCalledWith(workspaceFolder);
        expect(mockedMoveIntoWorktree).toHaveBeenCalledWith(
            workspaceFolder,
            selectedWorktree.detail
        );
    });

    it("copies the error and opens an issue when the user clicks the error button", async () => {
        mockedMoveIntoWorktree.mockRejectedValue(new Error("cannot open folder"));
        mockedShowErrorMessageWithButton.mockResolvedValue("Copy Error and Open an Issue");

        await gitWorktreeList();

        expect(mockedCopyToClipboard).toHaveBeenCalledWith("cannot open folder");
        expect(mockedOpenBrowser).toHaveBeenCalledWith(OPEN_ISSUE_URL);
    });

    it("does not open an issue when the user dismisses the error dialog", async () => {
        mockedMoveIntoWorktree.mockRejectedValue(new Error("cannot open folder"));
        mockedShowErrorMessageWithButton.mockResolvedValue(undefined);

        await gitWorktreeList();

        expect(mockedCopyToClipboard).not.toHaveBeenCalled();
        expect(mockedOpenBrowser).not.toHaveBeenCalled();
    });
});

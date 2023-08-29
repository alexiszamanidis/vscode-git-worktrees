import type { InputBoxOptions } from "vscode";
import {
    addNewWorktree,
    addRemoteWorktree,
    existsWorktree,
} from "../../../helpers/gitWorktreeHelpers";
import { OPEN_ISSUE_URL } from "../../../constants/constants";
import {
    fetch,
    selectBranch,
    isGitRepository,
    getRemoteBranches,
    removeLocalBranchesThatDoNotExistOnRemoteRepository,
    isBranchNameValid,
} from "../../../helpers/gitHelpers";
import {
    copyToClipboard,
    openBrowser,
    shouldRemoveStalledBranches,
} from "../../../helpers/helpers";
import {
    getUserInput,
    getWorkspaceFolder,
    showErrorMessageWithButton,
    showInformationMessage,
} from "../../../helpers/vsCodeHelpers";

// we need to check if the user's input value is a valid git branch name
const isBranchInputValid: InputBoxOptions["validateInput"] = async (branch: string) => {
    // we allow user input an empty string here,
    // because we will assign the remote branch as the new branch later if the input is an empty string
    if (branch === "") return "";

    const isBranchValid = await isBranchNameValid(branch);

    if (!isBranchValid) return `fatal: '${branch}' is not a valid branch name`;

    return "";
};

const gitWorktreeAdd = async (): Promise<void> => {
    try {
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) return;

        const isGitRepo = await isGitRepository(workspaceFolder);
        if (!isGitRepo) throw new Error("This is not a git repository.");

        showInformationMessage("Calculating remote branches to suggest you...");

        await fetch(workspaceFolder);

        if (shouldRemoveStalledBranches) {
            await removeLocalBranchesThatDoNotExistOnRemoteRepository(workspaceFolder);
        }

        const remoteBranches = await getRemoteBranches(workspaceFolder);
        const remoteBranch = await selectBranch(remoteBranches);
        if (!remoteBranch) return;

        let newBranch = await getUserInput(
            "New branch",
            "Type the name of the new branch",
            isBranchInputValid
        );

        // if the user didn't select a branch, we assign the remote branch as the new branch
        if (!newBranch) {
            newBranch = remoteBranch;
        }

        const isWorktree = await existsWorktree(workspaceFolder, newBranch);
        if (isWorktree) throw new Error(`Worktree '${newBranch}' already exists.`);

        showInformationMessage(`Creating new Worktree named '${newBranch}'...`);

        const isSameBranch = remoteBranch === newBranch;

        if (isSameBranch) {
            await addRemoteWorktree(workspaceFolder, remoteBranch, newBranch);
        } else {
            await addNewWorktree(workspaceFolder, remoteBranch, newBranch);
        }
    } catch (e: any) {
        const errorMessage = e.message;
        const buttonName = "Copy Error and Open an Issue";
        const answer = await showErrorMessageWithButton({ errorMessage, buttonName });

        if (answer !== buttonName) return;

        await copyToClipboard(errorMessage);
        await openBrowser(OPEN_ISSUE_URL);
    }
};

export default gitWorktreeAdd;

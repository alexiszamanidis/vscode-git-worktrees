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
    existsRemoteBranch,
} from "../../../helpers/gitHelpers";
import {
    copyToClipboard,
    openBrowser,
    shouldRemoveStalledBranches,
} from "../../../helpers/helpers";
import {
    getUserInput,
    showErrorMessageWithButton,
    showInformationMessage,
} from "../../../helpers/vsCodeHelpers";

const gitWorktreeAdd = async (): Promise<void> => {
    try {
        const isGitRepo = await isGitRepository();
        if (!isGitRepo) throw new Error("This is not a git repository.");

        const newBranch = await getUserInput("New branch", "Type the name of the new branch");
        if (!newBranch) return;

        const isWorktree = await existsWorktree(newBranch);
        if (isWorktree) throw new Error(`Worktree '${newBranch}' already exists.`);

        showInformationMessage("Calculating remote branches to suggest you...");

        await fetch();

        if (shouldRemoveStalledBranches) {
            await removeLocalBranchesThatDoNotExistOnRemoteRepository();
        }

        const remoteBranches = await getRemoteBranches();
        let remoteBranch = await selectBranch(remoteBranches);
        // if the user didn't select a remote branch, we assign the new branch as the remote branch
        if (!remoteBranch) {
            remoteBranch = newBranch;
        }

        const isSameBranch = remoteBranch === newBranch;

        if (!isSameBranch) {
            const isRemoteBranch = await existsRemoteBranch(newBranch);
            if (isRemoteBranch) throw new Error(`Branch '${newBranch}' already exists.`);
        }

        showInformationMessage(`Creating new Worktree named '${newBranch}'...`);

        if (isSameBranch) await addRemoteWorktree(remoteBranch, newBranch);
        await addNewWorktree(remoteBranch, newBranch);
    } catch (e: any) {
        const errorMessage = e.message;
        const buttonName = "Open an Issue";
        // const buttonName = "Copy Error and Open an Issue";
        const answer = await showErrorMessageWithButton({ errorMessage, buttonName });

        if (answer !== buttonName) return;

        // await copyToClipboard(errorMessage);
        await openBrowser(OPEN_ISSUE_URL);
    }
};

export default gitWorktreeAdd;

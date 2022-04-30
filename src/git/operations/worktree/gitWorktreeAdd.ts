import {
    addWorktree,
    calculateNewWorktreePath,
    existsWorktree,
    getWorktrees,
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
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
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

        showInformationMessage("Calculating remote branches to suggest you...");

        await fetch();
        await removeLocalBranchesThatDoNotExistOnRemoteRepository();

        const isRemoteBranch = await existsRemoteBranch(newBranch);
        if (isRemoteBranch) throw new Error(`Branch '${newBranch}' already exists.`);

        const isWorktree = await existsWorktree(newBranch);
        if (isWorktree) throw new Error(`Worktree '${newBranch}' already exists.`);

        const remoteBranches = await getRemoteBranches();
        const remoteBranch = await selectBranch(remoteBranches);
        if (!remoteBranch) return;

        showInformationMessage(`Creating new Worktree named '${newBranch}'...`);

        const newWorktreePath = await calculateNewWorktreePath(newBranch);

        await addWorktree(remoteBranch, newBranch, newWorktreePath);
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

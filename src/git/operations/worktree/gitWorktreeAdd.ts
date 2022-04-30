import {
    addWorktree,
    calculateNewWorktreePath,
    getWorktrees,
} from "../../../helpers/gitWorktreeHelpers";
import { OPEN_ISSUE_URL } from "../../../constants/constants";
import {
    fetch,
    selectBranch,
    isGitRepository,
    getRemoteBranches,
    removeLocalBranchesThatDoNotExistOnRemoteRepository,
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

        const remoteBranches = await getRemoteBranches();
        const foundBranch = remoteBranches.find((branch) => branch === newBranch);
        if (foundBranch) throw new Error(`Branch '${foundBranch}' already exists.`);

        const worktrees = await getWorktrees();
        const foundWorktree = worktrees.find((wt) => wt.worktree === newBranch);
        if (foundWorktree) throw new Error(`Worktree '${foundWorktree.worktree}' already exists.`);

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

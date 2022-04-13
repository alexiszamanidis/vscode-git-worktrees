import { OPEN_ISSUE_URL } from "@constants/constants";
import { isGitRepository } from "../../../helpers/gitHelpers";
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
import { showErrorMessageWithButton, showInformationMessage } from "../../../helpers/vsCodeHelpers";
import {
    selectWorktree,
    getWorktrees,
    removeWorktree,
    pruneWorktrees,
} from "../../../helpers/gitWorktreeHelpers";

const gitWorktreeRemove = async (): Promise<void> => {
    try {
        if (!isGitRepository()) throw new Error("This is not a git repository.");

        const worktrees = await getWorktrees();

        const worktree = await selectWorktree(worktrees);

        if (!worktree) return;

        await removeWorktree(worktree);

        await pruneWorktrees();

        await showInformationMessage(`Worktree named '${worktree.label}' was removed successfully`);
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

export default gitWorktreeRemove;

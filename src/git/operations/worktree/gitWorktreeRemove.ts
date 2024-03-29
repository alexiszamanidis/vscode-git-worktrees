import { OPEN_ISSUE_URL } from "../../../constants/constants";
import { isGitRepository } from "../../../helpers/gitHelpers";
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
import {
    getWorkspaceFolder,
    showErrorMessageWithButton,
    showInformationMessage,
} from "../../../helpers/vsCodeHelpers";
import { getWorktree, removeWorktree } from "../../../helpers/gitWorktreeHelpers";

const gitWorktreeRemove = async (): Promise<void> => {
    try {
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) return;

        const isGitRepo = await isGitRepository(workspaceFolder);
        if (!isGitRepo) throw new Error("This is not a git repository.");

        const worktree = await getWorktree(workspaceFolder);

        if (!worktree) return;

        await removeWorktree(workspaceFolder, worktree);

        await showInformationMessage(`Worktree named '${worktree.label}' was removed successfully`);
    } catch (e: any) {
        const errorMessage = e.message;
        const buttonName = "Copy Error and Open an Issue";
        const answer = await showErrorMessageWithButton({ errorMessage, buttonName });

        if (answer !== buttonName) return;

        await copyToClipboard(errorMessage);
        await openBrowser(OPEN_ISSUE_URL);
    }
};

export default gitWorktreeRemove;

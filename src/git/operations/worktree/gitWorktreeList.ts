import { OPEN_ISSUE_URL } from "../../../constants/constants";
import { isGitRepository } from "../../../helpers/gitHelpers";
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
import { getWorkspaceFolder, showErrorMessageWithButton } from "../../../helpers/vsCodeHelpers";
import { moveIntoWorktree, getWorktree } from "../../../helpers/gitWorktreeHelpers";

const gitWorktreeList = async (): Promise<void> => {
    try {
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) return;

        const isGitRepo = await isGitRepository(workspaceFolder);
        if (!isGitRepo) throw new Error("This is not a git repository.");

        const worktree = await getWorktree(workspaceFolder);

        if (!worktree) return;

        await moveIntoWorktree(workspaceFolder, worktree.detail);
    } catch (e: any) {
        const errorMessage = e.message;
        const buttonName = "Copy Error and Open an Issue";
        const answer = await showErrorMessageWithButton({ errorMessage, buttonName });

        if (answer !== buttonName) return;

        await copyToClipboard(errorMessage);
        await openBrowser(OPEN_ISSUE_URL);
    }
};

export default gitWorktreeList;

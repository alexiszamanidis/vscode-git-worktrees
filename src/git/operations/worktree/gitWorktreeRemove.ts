import { OPEN_ISSUE_URL } from "../../../constants/constants";
import { isGitRepository } from "../../../helpers/gitHelpers";
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
import {
    getWorkspaceFolder,
    showErrorMessageWithButton,
    showInformationMessage,
} from "../../../helpers/vsCodeHelpers";
import { getWorktree, removeWorktree } from "../../../helpers/gitWorktreeHelpers";
import logger from "../../../helpers/logger";

const gitWorktreeRemove = async (): Promise<void> => {
    logger.debug("Entering gitWorktreeRemove");

    try {
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            logger.warn("No workspace folder found. Aborting.");
            return;
        }
        logger.debug(`Workspace folder: ${workspaceFolder}`);

        const isGitRepo = await isGitRepository(workspaceFolder);
        logger.debug(`isGitRepository: ${isGitRepo}`);

        if (!isGitRepo) {
            logger.error("This is not a git repository.");
            throw new Error("This is not a git repository.");
        }

        const worktree = await getWorktree(workspaceFolder);
        logger.debug(`Worktree detail: ${JSON.stringify(worktree)}`);

        if (!worktree) {
            logger.warn("No worktree found.");
            return;
        }

        logger.info(`Removing worktree '${worktree.label}'...`);
        await removeWorktree(workspaceFolder, worktree);
        logger.info(`Worktree '${worktree.label}' removed successfully.`);

        await showInformationMessage(`Worktree named '${worktree.label}' was removed successfully`);
    } catch (e: any) {
        const errorMessage = e.message;
        logger.error(`Caught exception: ${errorMessage}`);

        const buttonName = "Copy Error and Open an Issue";
        const answer = await showErrorMessageWithButton({ errorMessage, buttonName });

        if (answer !== buttonName) {
            logger.info("User dismissed error dialog.");
            return;
        }

        logger.info("User chose to report the error. Copying and opening issue.");
        await copyToClipboard(errorMessage);
        await openBrowser(OPEN_ISSUE_URL);
    } finally {
        logger.debug("Exiting gitWorktreeRemove");
    }
};

export default gitWorktreeRemove;

import { OPEN_ISSUE_URL } from "../../../constants/constants";
import { isGitRepository } from "../../../helpers/gitHelpers";
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
import { getWorkspaceFolder, showErrorMessageWithButton } from "../../../helpers/vsCodeHelpers";
import { moveIntoWorktree, getWorktree } from "../../../helpers/gitWorktreeHelpers";
import logger from "../../../helpers/logger";

const gitWorktreeList = async (): Promise<void> => {
    logger.debug("Entering gitWorktreeList");

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

        logger.info("Moving into worktree...");
        await moveIntoWorktree(workspaceFolder, worktree.detail);
        logger.info("Successfully moved into worktree.");
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
        logger.debug("Exiting gitWorktreeList");
    }
};

export default gitWorktreeList;

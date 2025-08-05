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
    isBranchInputValid,
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
import logger from "../../../helpers/logger";

const gitWorktreeAdd = async (): Promise<void> => {
    logger.debug("Entering gitWorktreeAdd");

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

        showInformationMessage("Calculating remote branches to suggest you...");
        logger.info("Calculating remote branches to suggest");

        await fetch(workspaceFolder);
        logger.debug("Fetched latest remote branches");

        if (shouldRemoveStalledBranches) {
            logger.info("Removing local branches that do not exist on remote repository");
            await removeLocalBranchesThatDoNotExistOnRemoteRepository(workspaceFolder);
        }

        const remoteBranches = await getRemoteBranches(workspaceFolder);
        logger.debug(`Remote branches: ${JSON.stringify(remoteBranches)}`);

        const remoteBranch = await selectBranch(remoteBranches);
        if (!remoteBranch) {
            logger.warn("No remote branch selected. Aborting.");
            return;
        }
        logger.debug(`Selected remote branch: ${remoteBranch}`);

        let newBranch = await getUserInput(
            "New branch",
            "Type the name of the new branch",
            isBranchInputValid
        );

        if (!newBranch) {
            newBranch = remoteBranch;
            logger.debug(
                `No new branch name input. Using remote branch '${newBranch}' as new branch`
            );
        } else {
            logger.debug(`User input new branch name: ${newBranch}`);
        }

        const isWorktree = await existsWorktree(workspaceFolder, newBranch);
        logger.debug(`Worktree exists for branch '${newBranch}': ${isWorktree}`);

        if (isWorktree) {
            logger.error(`Worktree '${newBranch}' already exists.`);
            throw new Error(`Worktree '${newBranch}' already exists.`);
        }

        showInformationMessage(`Creating new Worktree named '${newBranch}'...`);
        logger.info(`Creating new Worktree named '${newBranch}'`);

        const isSameBranch = remoteBranch === newBranch;

        if (isSameBranch) {
            logger.debug("Adding remote worktree");
            await addRemoteWorktree(workspaceFolder, remoteBranch, newBranch);
        } else {
            logger.debug("Adding new worktree");
            await addNewWorktree(workspaceFolder, remoteBranch, newBranch);
        }

        logger.info("Worktree creation process completed successfully");
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
        logger.debug("Exiting gitWorktreeAdd");
    }
};

export default gitWorktreeAdd;

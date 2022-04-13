import { calculateNewWorktreePath } from "helpers/gitWorktreeHelpers";
import { OPEN_ISSUE_URL } from "@constants/constants";
import { isGitRepository } from "../../../helpers/gitHelpers";
import { copyToClipboard, openBrowser } from "../../../helpers/helpers";
import { showErrorMessageWithButton } from "../../../helpers/vsCodeHelpers";

const gitWorktreeAdd = async (): Promise<void> => {
    try {
        if (!isGitRepository()) throw new Error("This is not a git repository.");

        const newWorktreePath = await calculateNewWorktreePath();
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

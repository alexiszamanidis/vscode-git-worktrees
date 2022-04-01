import * as util from "util";
import { getCurrentPath } from "./helpers";

const exec = util.promisify(require("child_process").exec);

export const isGitRepository = async (): Promise<boolean> => {
    const command = "git rev-parse --is-inside-work-tree";
    const options = {
        cwd: await getCurrentPath(),
    };

    try {
        await exec(command, options);
        // const { stdout } = await exec(command, options);
        // console.log(stdout);
        return true;
    } catch (e: any) {
        // throw Error(e);
        // console.log(e.message);
        return false;
    }
};

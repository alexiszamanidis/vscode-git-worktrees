import * as vscode from "vscode";
import logger from "./logger";

jest.mock("vscode");

const getChannel = () =>
    (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value as {
        appendLine: jest.Mock;
        show: jest.Mock;
        hide: jest.Mock;
        dispose: jest.Mock;
    };

describe("logger", () => {
    beforeEach(() => {
        getChannel().appendLine.mockClear();
        getChannel().show.mockClear();
        getChannel().hide.mockClear();
        getChannel().dispose.mockClear();
    });

    it("creates an output channel with the app name", () => {
        expect(vscode.window.createOutputChannel).toHaveBeenCalledWith("Git Worktrees");
    });

    it("writes info, debug, warn, and string error lines", () => {
        logger.info("hello");
        logger.debug("dbg");
        logger.warn("careful");
        logger.error("boom");
        logger.trace("trace", { a: 1 });

        const lines = getChannel().appendLine.mock.calls.map((call: string[]) => call[0]);
        expect(lines.some((line) => line.includes("[INF]") && line.includes("hello"))).toBe(true);
        expect(lines.some((line) => line.includes("[DBG]") && line.includes("dbg"))).toBe(true);
        expect(lines.some((line) => line.includes("[WRN]") && line.includes("careful"))).toBe(true);
        expect(lines.some((line) => line.includes("[ERR]") && line.includes("boom"))).toBe(true);
        expect(lines.some((line) => line.includes("[TRC]") && line.includes("trace"))).toBe(true);
    });

    it("includes the stack when logging an Error", () => {
        logger.error(new Error("stacked"));

        const line = getChannel().appendLine.mock.calls[0][0] as string;
        expect(line).toContain("[ERR]");
        expect(line).toContain("stacked");
        expect(line).toContain("Error: stacked");
    });

    it("toggles the output channel visibility", () => {
        logger.hide();
        getChannel().hide.mockClear();
        getChannel().show.mockClear();

        logger.toggle();
        expect(getChannel().show).toHaveBeenCalled();

        logger.toggle();
        expect(getChannel().hide).toHaveBeenCalled();
    });

    it("show and hide update visibility", () => {
        logger.show();
        expect(getChannel().show).toHaveBeenCalled();

        logger.hide();
        expect(getChannel().hide).toHaveBeenCalled();
    });

    it("disposes the output channel", () => {
        logger.dispose();
        expect(getChannel().dispose).toHaveBeenCalled();
    });
});

import { APP_NAME } from "../constants/constants";
import * as vscode from "vscode";

class Logger implements vscode.Disposable {
    private readonly output: vscode.OutputChannel;
    private isVisible = false;

    constructor(private channelName: string = "Extension Logger") {
        this.output = vscode.window.createOutputChannel(this.channelName);
    }

    private write(level: string, message: string) {
        const timestamp = new Date().toISOString();
        this.output.appendLine(`[${timestamp}] [${level}] ${message}`);
    }

    info(message: string) {
        this.write("INF", message);
    }

    debug(message: string) {
        this.write("DBG", message);
    }

    warn(message: string) {
        this.write("WRN", message);
    }

    error(message: string | Error) {
        if (message instanceof Error) {
            this.write("ERR", `${message.message}\n${message.stack}`);
        } else {
            this.write("ERR", message);
        }
    }

    trace(message: string, ...args: any[]) {
        this.write("TRC", `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`);
    }

    toggle(): void {
        this.isVisible = !this.isVisible;
        this.isVisible ? this.output.show() : this.output.hide();
    }

    show(): void {
        this.output.show();
        this.isVisible = true;
    }

    hide(): void {
        this.output.hide();
        this.isVisible = false;
    }

    dispose(): void {
        this.output.dispose();
    }
}

export default new Logger(APP_NAME);

import * as winston from "winston";
import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";

// Define accepted log levels
const validLogLevels = ["error", "warn", "info", "debug"] as const;
type LogLevel = typeof validLogLevels[number];

// Get user-configured level
const rawLogLevel = vscode.workspace
    .getConfiguration()
    .get<string>("vsCodeGitWorktrees.log.level", "silent")
    ?.toLowerCase();

// If invalid, treat as "silent"
const isValidLogLevel = validLogLevels.includes(rawLogLevel as LogLevel);
const logLevel: LogLevel | "silent" = isValidLogLevel ? (rawLogLevel as LogLevel) : "silent";

// Enable file logging only for accepted log levels
const enableFileLogging = logLevel !== "silent";

// Use workspace folder or fallback
const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
const logDir = workspaceFolder || path.join(os.homedir(), ".vsCodeGitWorktrees");
const logFile = path.join(logDir, "vsCodeGitWorktrees.log");

// Setup transports
const transports: winston.transport[] = [];

if (enableFileLogging) {
    transports.push(new winston.transports.File({ filename: logFile }));
    transports.push(new winston.transports.Console());
}

// Create the Winston logger
const baseLogger = winston.createLogger({
    level: enableFileLogging ? logLevel : "silent", // internally suppress log output
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports,
});

// Get calling function name for log prefix
function getCallerFunctionName(): string {
    const err = new Error();
    const stack = err.stack?.split("\n") || [];
    const match = stack[3]?.match(/at (\w+)/);
    return match?.[1] || "anonymous";
}

// Export logger with function-prefixed messages
const logger = {
    debug: (msg: string) => {
        if (logLevel === "debug") baseLogger.debug(`[${getCallerFunctionName()}] ${msg}`);
    },
    info: (msg: string) => {
        if (["debug", "info"].includes(logLevel))
            baseLogger.info(`[${getCallerFunctionName()}] ${msg}`);
    },
    warn: (msg: string) => {
        if (["debug", "info", "warn"].includes(logLevel))
            baseLogger.warn(`[${getCallerFunctionName()}] ${msg}`);
    },
    error: (msg: string) => {
        if (logLevel !== "silent") baseLogger.error(`[${getCallerFunctionName()}] ${msg}`);
    },
};

export default logger;

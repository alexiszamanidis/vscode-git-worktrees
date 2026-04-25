import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as yaml from "js-yaml";
import { createReadStream, createWriteStream, promises } from "fs";
import { promisify } from "util";
import { pipeline as pipelineCallback } from "stream";

import { executeCommand } from "./helpers";
import logger from "./logger";
import { WORKTREE_CONFIG_FILENAME } from "../constants/constants";

const pipeline = promisify(pipelineCallback);

export interface WorktreeLifecycleConfig {
    add?: { copy?: string[]; commands?: string[] };
    remove?: { commands?: string[] };
    switch?: { commands?: string[] };
}

export function parseWorktreeConfig(workspaceFolder: string): WorktreeLifecycleConfig | null {
    const configPath = path.join(workspaceFolder, WORKTREE_CONFIG_FILENAME);

    if (!fs.existsSync(configPath)) {
        logger.debug(`No ${WORKTREE_CONFIG_FILENAME} found in ${workspaceFolder}`);
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, "utf-8");
        const parsed = yaml.load(content) as WorktreeLifecycleConfig;

        if (!parsed || typeof parsed !== "object") {
            logger.warn(`${WORKTREE_CONFIG_FILENAME} is empty or invalid`);
            return null;
        }

        return parsed;
    } catch (e: any) {
        logger.warn(`Failed to parse ${WORKTREE_CONFIG_FILENAME}: ${e.message}`);
        return null;
    }
}

export function resolveCommandVariables(
    command: string,
    worktreePath: string,
    workspaceFolder: string
): string {
    let resolved = command;

    const userHome = process.env.HOME || process.env.USERPROFILE || "";
    resolved = resolved.replace(/\$\{userHome\}/g, userHome);

    // ${workspaceFolder} resolves to the worktree path (the actual workspace)
    resolved = resolved.replace(/\$\{workspaceFolder\}/g, worktreePath);

    // ${workspaceFolderBasename} resolves to the worktree folder name
    const basename = path.basename(worktreePath);
    resolved = resolved.replace(/\$\{workspaceFolderBasename\}/g, basename);

    // ${repositoryName} resolves to the origin repository name
    const repositoryName = path.basename(workspaceFolder);
    resolved = resolved.replace(/\$\{repositoryName\}/g, repositoryName);

    return resolved;
}

export async function copyInitFiles(
    config: WorktreeLifecycleConfig,
    sourceFolder: string,
    targetFolder: string
): Promise<void> {
    const files = config.add?.copy;
    if (!files || files.length === 0) {
        return;
    }

    for (const file of files) {
        const sourcePath = path.join(sourceFolder, file);
        const targetPath = path.join(targetFolder, file);

        if (!fs.existsSync(sourcePath)) {
            logger.warn(`Init copy: source file not found, skipping: ${sourcePath}`);
            continue;
        }

        try {
            const targetDir = path.dirname(targetPath);
            await promises.mkdir(targetDir, { recursive: true });
            await pipeline(createReadStream(sourcePath), createWriteStream(targetPath));
            logger.debug(`Init copy: ${file} copied to new worktree`);
        } catch (e: any) {
            logger.warn(`Init copy: failed to copy ${file}: ${e.message}`);
        }
    }
}

export async function runLifecycleCommands(
    commands: string[],
    cwd: string,
    workspaceFolder: string,
    title: string
): Promise<void> {
    if (commands.length === 0) {
        return;
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false,
        },
        async (progress) => {
            for (let i = 0; i < commands.length; i++) {
                const rawCmd = commands[i];
                const cmd = resolveCommandVariables(rawCmd, cwd, workspaceFolder);
                progress.report({
                    message: `(${i + 1}/${commands.length}) ${cmd}`,
                    increment: 100 / commands.length,
                });

                try {
                    logger.debug(`Lifecycle command: running '${cmd}' in ${cwd}`);
                    await executeCommand(cmd, { cwd });
                    logger.debug(`Lifecycle command: '${cmd}' completed`);
                } catch (e: any) {
                    logger.warn(`Lifecycle command failed: '${cmd}': ${e.message}`);
                    vscode.window.showWarningMessage(
                        `Worktree lifecycle command failed: '${cmd}'. ${e.message}`
                    );
                }
            }
        }
    );
}

export async function executeWorktreeAddHooks(
    workspaceFolder: string,
    newWorktreePath: string
): Promise<void> {
    const config = parseWorktreeConfig(workspaceFolder);
    if (!config) {
        return;
    }

    logger.info(`Found ${WORKTREE_CONFIG_FILENAME}, executing add hooks`);

    try {
        await copyInitFiles(config, workspaceFolder, newWorktreePath);

        const commands = config.add?.commands;
        if (commands && commands.length > 0) {
            await runLifecycleCommands(
                commands,
                newWorktreePath,
                workspaceFolder,
                "Running worktree add hooks"
            );
        }

        logger.info("Worktree add hooks completed");
    } catch (e: any) {
        logger.warn(`Worktree add hooks error: ${e.message}`);
        vscode.window.showWarningMessage(`Worktree add hooks encountered an error: ${e.message}`);
    }
}

export async function executeWorktreeRemoveHooks(
    workspaceFolder: string,
    worktreePath: string
): Promise<void> {
    const config = parseWorktreeConfig(workspaceFolder);
    if (!config) {
        return;
    }

    const commands = config.remove?.commands;
    if (!commands || commands.length === 0) {
        return;
    }

    logger.info(`Found ${WORKTREE_CONFIG_FILENAME}, executing remove hooks`);

    try {
        await runLifecycleCommands(
            commands,
            worktreePath,
            workspaceFolder,
            "Running worktree remove hooks"
        );
        logger.info("Worktree remove hooks completed");
    } catch (e: any) {
        logger.warn(`Worktree remove hooks error: ${e.message}`);
        vscode.window.showWarningMessage(
            `Worktree remove hooks encountered an error: ${e.message}`
        );
    }
}

export async function executeWorktreeSwitchHooks(
    workspaceFolder: string,
    worktreePath: string
): Promise<void> {
    const config = parseWorktreeConfig(workspaceFolder);
    if (!config) {
        return;
    }

    const commands = config.switch?.commands;
    if (!commands || commands.length === 0) {
        return;
    }

    logger.info(`Found ${WORKTREE_CONFIG_FILENAME}, executing switch hooks`);

    try {
        await runLifecycleCommands(
            commands,
            worktreePath,
            workspaceFolder,
            "Running worktree switch hooks"
        );
        logger.info("Worktree switch hooks completed");
    } catch (e: any) {
        logger.warn(`Worktree switch hooks error: ${e.message}`);
        vscode.window.showWarningMessage(
            `Worktree switch hooks encountered an error: ${e.message}`
        );
    }
}

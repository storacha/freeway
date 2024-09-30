import assert from "node:assert";
import { fork } from "node:child_process";
import events from "node:events";
import path from "node:path";
import treeKill from "tree-kill";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);

export const wranglerEntryPath = path.resolve(
    __dirname,
    "../node_modules/packages/wrangler/bin/wrangler.js"
);

/**
 * Runs the command `wrangler pages dev` in a child process.
 *
 * Returns an object that gives you access to:
 *
 * - `ip` and `port` of the http-server hosting the pages project
 * - `stop()` function that will close down the server.
 */
export async function runWranglerPagesDev(
    cwd,
    publicPath,
    options,
    env
) {
    if (publicPath) {
        return runLongLivedWrangler(
            ["pages", "dev", publicPath, "--x-dev-env", "--ip=127.0.0.1", ...options],
            cwd,
            env
        );
    } else {
        return runLongLivedWrangler(
            ["pages", "dev", "--x-dev-env", "--ip=127.0.0.1", ...options],
            cwd,
            env
        );
    }
}

/**
 * Runs the command `wrangler dev` in a child process.
 *
 * Returns an object that gives you access to:
 *
 * - `ip` and `port` of the http-server hosting the pages project
 * - `stop()` function that will close down the server.
 */
export async function runWranglerDev(
    cwd,
    options,
    env
) {
    return runLongLivedWrangler(
        ["dev", "--x-dev-env", "--ip=127.0.0.1", ...options],
        cwd,
        env
    );
}

async function runLongLivedWrangler(
    command,
    cwd,
    env
) {
    let settledReadyPromise = false;
    let resolveReadyPromise
    let rejectReadyPromise
    const ready = new Promise((resolve, reject) => {
        resolveReadyPromise = resolve;
        rejectReadyPromise = reject;
    });

    const wranglerProcess = fork(wranglerEntryPath, command, {
        stdio: [/*stdin*/ "ignore", /*stdout*/ "pipe", /*stderr*/ "pipe", "ipc"],
        cwd,
        env: { ...process.env, ...env, PWD: cwd },
    }).on("message", (message) => {
        if (settledReadyPromise) return;
        settledReadyPromise = true;
        clearTimeout(timeoutHandle);
        resolveReadyPromise(JSON.parse(message.toString()));
    });

    const chunks = [];
    wranglerProcess.stdout?.on("data", (chunk) => {
        chunks.push(chunk);
    });
    wranglerProcess.stderr?.on("data", (chunk) => {
        chunks.push(chunk);
    });
    const getOutput = () => Buffer.concat(chunks).toString();
    const clearOutput = () => (chunks.length = 0);

    const timeoutHandle = setTimeout(() => {
        if (settledReadyPromise) return;
        settledReadyPromise = true;
        const separator = "=".repeat(80);
        const message = [
            "Timed out starting long-lived Wrangler:",
            separator,
            getOutput(),
            separator,
        ].join("\n");
        rejectReadyPromise(new Error(message));
    }, 50_000);

    async function stop() {
        return new Promise((resolve) => {
            assert(
                wranglerProcess.pid,
                `Command "${command.join(" ")}" had no process id`
            );
            treeKill(wranglerProcess.pid, (e) => {
                if (e) {
                    console.error(
                        "Failed to kill command: " + command.join(" "),
                        wranglerProcess.pid,
                        e
                    );
                }
                // fallthrough to resolve() because either the process is already dead
                // or don't have permission to kill it or some other reason?
                // either way, there is nothing we can do and we don't want to fail the test because of this
                resolve();
            });
        });
    }

    const { ip, port } = await ready;
    return { ip, port, stop, getOutput, clearOutput };
}
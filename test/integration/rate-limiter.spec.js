import { resolve } from "path";
import path from "node:path";
import { fetch } from "undici";
import { jest } from '@jest/globals'
import { runWranglerDev } from "../run-wrangler-long-lived";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);
describe("'wrangler dev' correctly renders pages", () => {
    let ip,
        port,
        stop,
        getOutput
    jest.setTimeout(30000) // 30 seconds

    beforeAll(async () => {
        ({ ip, port, stop, getOutput } = await runWranglerDev(
            resolve(__dirname, ".."),
            ["--local", "--port=0", "--inspector-port=0"]
        ));
    });

    afterAll(async () => {
        await stop?.();
    });

    it("ratelimit binding is defined ", async () => {
        let response = await fetch(`http://${ip}:${port}/`);
        let content = await response.text();
        expect(content).toEqual("Success");

        response = await fetch(`http://${ip}:${port}/`);
        content = await response.text();
        expect(content).toEqual("Success");

        response = await fetch(`http://${ip}:${port}/`);
        content = await response.text();
        expect(content).toEqual("Slow down");
    });
});
import { readFileSync } from "fs";
import { resolve } from "path";
import { createInterface, Interface } from "readline";

import { Scanner } from "./Scanner";
import { Token } from "./Token";

let hadError = false;

export function error(line: number, message: string) {
    report(line, "", message);
}

export function report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error${where}: ${message}`);
    hadError = true;
}

export function run(contents: string) {
    const scanner: Scanner = new Scanner(contents);
    const tokens: Token[] = scanner.scanTokens();

    tokens.forEach((element) => {
        console.log(element);
    });
}

export function runFile(path: string) {
    run(readFileSync(resolve(path)).toString());
    if (hadError) process.exit(65);
}

export async function runPrompt() {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const line = await requestPrompt(rl);
        if (line == null || line == "q") {
            rl.close();
            break;
        }
        run(line);
        hadError = false;
    }
}

function requestPrompt(rl: Interface): Promise<string | null> {
    return new Promise((resolve) => {
        rl.question("\ntslox> ", (line) => {
            line = line.trim();
            if (line.length == 0) {
                resolve(null);
                return;
            }
            resolve(line);
        });
    });
}

import { readFile } from "fs/promises";
import { resolve } from "path";
import { createInterface, Interface } from "readline";

import { Scanner } from "./Lexer/Scanner";
import { Token } from "./Lexer/Token";

let hadError = false;

export function reportError(line: number, column: number, message: string) {
    console.error(`[${line}:${column}] Error: ${message}`);
    hadError = true;
}

export function runContents(contents: string) {
    const scanner: Scanner = new Scanner(contents);
    const tokens: Token[] = scanner.scanTokens();

    tokens.forEach((element) => {
        console.log(element);
    });
}

export async function runFile(path: string) {
    const buffer = await readFile(resolve(path));
    runContents(buffer.toString());

    if (hadError) process.exit(65);
}

export async function runPrompt() {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const line = await requestCommandLinePrompt(rl);
        if (line == null || ["q", "quit", "exit"].includes(line)) {
            rl.close();
            break;
        }
        runContents(line);
        hadError = false;
    }
}

function requestCommandLinePrompt(rl: Interface): Promise<string | null> {
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

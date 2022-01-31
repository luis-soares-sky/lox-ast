import { readFile } from "fs/promises";
import { resolve } from "path";
import { createInterface, Interface } from "readline";

import { Scanner } from "./Lexer/Scanner";
import { Token } from "./Lexer/Token";
import { Parser } from "./Parser/Parser";
import { Interpreter } from "./Parser/Interpreter";

const interpreter = new Interpreter();
let hadError = false;
let hadRuntimeError = false;

export class ParseError extends Error {
    public constructor(
        public readonly token: Token,
        public readonly message: string
    ) {
        super();
    }
}

export class RuntimeError extends Error {
    public constructor(
        public readonly token: Token,
        public readonly message: string
    ) {
        super();
    }
}

export function reportError(line: number, column: number, where: string, message: string) {
    console.error(`[${line}:${column}] Error${where}: ${message}`);
    hadError = true;
}

export function reportRuntimeError(error: RuntimeError) {
    console.error(`[${error.token.line}:${error.token.column}] Runtime error: ${error.message}`);
    hadRuntimeError = true;
}

export function runContents(contents: string) {
    const scanner = new Scanner(contents);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (hadError) return; // Stop if there was a syntax error.

    interpreter.interpret(statements);
}

export async function runFile(path: string) {
    const buffer = await readFile(resolve(path));
    runContents(buffer.toString());

    if (hadError) return process.exit(65);
    if (hadRuntimeError) return process.exit(70);
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
        console.log(); // Blank line after printing result.
        hadError = false;
    }
}

function requestCommandLinePrompt(rl: Interface): Promise<string | null> {
    return new Promise((resolve) => {
        rl.question("tslox> ", (line) => {
            line = line.trim();
            if (line.length == 0) {
                resolve(null);
                return;
            }
            resolve(line);
        });
    });
}

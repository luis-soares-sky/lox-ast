import { readFile } from "fs/promises";
import { resolve } from "path";
import { createInterface, Interface } from "readline";

import { Scanner } from "./Lexer/Scanner";
import { Token } from "./Lexer/Token";
import { Parser } from "./Parser/Parser";
import { Interpreter } from "./Interpreter/Interpreter";
import { Resolver } from "./Interpreter/Resolver";

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

export class ReturnError extends Error {
    public constructor(
        public readonly value: unknown
    ) {
        super();
    }
}

export function reportError(line: number, column: number, where: string, message: string) {
    console.error(`[${line}:${column}] Error${where}: ${message}`);
    hadError = true;
}

export function returnTokenError(token: Token, message: string) {
    reportError(token.line, token.column, "", message);
}

export function reportRuntimeError(error: RuntimeError) {
    console.error(`[${error.token.line}:${error.token.column}] Runtime error: ${error.message}`);
    hadRuntimeError = true;
}

export function run(source: string) {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens().filter((t) => t.type != TokenType.INLINE_COMMENT && t.type != TokenType.BLOCK_COMMENT);
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (hadError) return; // Stop if there was a syntax error.

    const resolver = new Resolver(interpreter);
    resolver.resolveStatementList(statements);

    if (hadError) return; // Stop if there was a resolution error.

    interpreter.interpret(statements);
}

export async function runFile(path: string) {
    const buffer = await readFile(resolve(path));
    run(buffer.toString());

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
        run(line);
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

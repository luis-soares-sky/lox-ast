#!/usr/bin/env node

import { runFile, runPrompt } from "./Lox";

const args = process.argv.slice(2);

if (args.length > 1) {
    console.error("Usage: tslox [path-to-script]");
}
else if (args.length == 1) {
    runFile(args[0]);
}
else {
    runPrompt();
}

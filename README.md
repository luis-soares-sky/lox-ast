# tslox

Typescript implementation of the `lox` programming language.

What is lox? The answer: http://craftinginterpreters.com/

## Motivation

I want to learn and know more about compilers so I can gain skills that will help with my full-time job, and this project is a good first step.

Warning: this is very much a work-in-progress, and so far the only thing that works is the lexing/scanning part of the compiler. Everything else will be added in time.

## Usage

Install dependencies using npm/yarn:

```bash
npm i
```

Then run the interpreter:

```bash
# Run in REPL mode.
npm start

# Or parse an entire file.
npm start "samples/helloWorld.lox"
```

If you want the interpreter to be available as a command-line app:

```bash
# Generate the source files.
npm install
npm run build

# Then link this repo.
npm link

# Then you can use the command.
tslox
tslox myFile.lox
```

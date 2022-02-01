import * as Stmt from "../Ast/Stmt";
import { ReturnError } from "../Lox";
import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";

export abstract class LoxCallable {
    public abstract arity(): number;
    public abstract call(interpreter: Interpreter, args: unknown[]): unknown;
    public abstract toString(): string;
}

export class LoxFunction extends LoxCallable {
    public constructor(
        private readonly declaration: Stmt.Fun,
        private readonly closure: Environment
    ) {
        super();
    }

    public arity(): number {
        return this.declaration.params.length;
    }

    public call(interpreter: Interpreter, args: unknown[]) {
        const environment = new Environment(this.closure);

        for (let i = 0; i < this.declaration.params.length; i++) {
            environment.define(this.declaration.params[i].lexeme, args[i]);
        }

        try {
            interpreter.executeBlock(this.declaration.body, environment);
        }
        catch (e) {
            if (e instanceof ReturnError) {
                return e.value;
            }
            throw e; // Rethrow everything that's not specifically a "Return" error.
        }
        return null;
    }

    public toString(): string {
        return `<fn ${this.declaration.name.lexeme}>`;
    }
}

// Native functions below.

export abstract class NativeLoxCallable extends LoxCallable {
    public toString = () => "<native fn>";
}

export function generateNativeEnvironment() {
    const e = new Environment();

    e.define("clock", new class extends NativeLoxCallable {
        public arity = () => 0;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        public call = (interpreter: Interpreter, args: unknown[]) => Date.now() / 1000;
    });

    return e;
}

import * as Stmt from "../Ast/Stmt";
import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";

export abstract class LoxCallable {
    public abstract arity(): number;
    public abstract call(interpreter: Interpreter, args: unknown[]): unknown;
    public abstract toString(): string;
}

export class LoxFunction extends LoxCallable {
    public constructor(private readonly declaration: Stmt.Fun) {
        super();
    }

    public arity(): number {
        return this.declaration.params.length;
    }

    public call(interpreter: Interpreter, args: unknown[]) {
        const environment = new Environment(interpreter.globals);

        for (let i = 0; i < this.declaration.params.length; i++) {
            environment.define(this.declaration.params[i].lexeme, args[i]);
        }

        interpreter.executeBlock(this.declaration.body, environment);
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

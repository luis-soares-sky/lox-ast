/* eslint-disable @typescript-eslint/no-unused-vars */
import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";

export abstract class LoxCallable {
    public abstract arity(): number;
    public abstract call(interpreter: Interpreter, args: unknown[]): unknown;
    public abstract toString(): string;
}

// Native functions below.

export abstract class NativeLoxCallable extends LoxCallable {
    public toString = () => "<native fn>";
}

export function generateNativeEnvironment() {
    const e = new Environment();

    e.define("clock", new class extends NativeLoxCallable {
        public arity = () => 0;
        public call = (interpreter: Interpreter, args: unknown[]) => Date.now() / 1000;
    });

    return e;
}

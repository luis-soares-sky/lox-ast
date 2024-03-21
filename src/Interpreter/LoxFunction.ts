import * as Stmt from "../Ast/Stmt";
import { ReturnError } from "../Lox";
import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";
import { LoxInstance } from "./LoxInstance";
import { LoxCallable } from "./LoxCallable";

export class LoxFunction extends LoxCallable {
    public constructor(
        private readonly declaration: Stmt.Fun,
        private readonly closure: Environment,
        private readonly isInitializer: boolean
    ) {
        super();
    }

    public arity(): number {
        return this.declaration.params.length;
    }

    public bind(instance: LoxInstance): LoxFunction {
        const environment = new Environment(this.closure);
        environment.define("this", instance);
        return new LoxFunction(this.declaration, environment, this.isInitializer);
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
                if (this.isInitializer) return this.closure.getAt(0, "this");

                return e.value;
            }
            throw e; // Rethrow everything that's not specifically a "Return" error.
        }

        if (this.isInitializer) return this.closure.getAt(0, "this");

        return null;
    }

    public toString(): string {
        return `<fn ${this.declaration.name.lexeme}>`;
    }
}

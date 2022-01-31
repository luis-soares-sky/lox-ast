import { RuntimeError } from "../Lox";
import { Token } from "../Lexer/Token";

export class Environment {
    private readonly values = new Map<string, unknown>();

    public constructor(private readonly enclosing?: Environment) { }

    public assign(name: Token, value: unknown) {
        if (this.values.has(name.lexeme)) {
            this.values.set(name.lexeme, value);
            return;
        }

        if (this.enclosing != null) {
            this.enclosing.assign(name, value);
            return;
        }

        throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
    }

    public define(name: string, value: unknown) {
        this.values.set(name, value);
    }

    public get(name: Token): unknown {
        if (this.values.has(name.lexeme)) {
            return this.values.get(name.lexeme);
        }

        if (this.enclosing != null) {
            return this.enclosing.get(name);
        }

        throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
    }
}

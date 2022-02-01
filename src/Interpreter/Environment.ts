import { RuntimeError } from "../Lox";
import { Token } from "../Lexer/Token";

export class Environment {
    private readonly values = new Map<string, unknown>();

    public constructor(private readonly enclosing?: Environment) { }

    public ancestor(distance: number): Environment {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let environment: Environment = this;
        for (let i = 0; i < distance; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            environment = environment.enclosing!;
        }
        return environment;
    }

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

    public assignAt(distance: number, name: Token, value: unknown) {
        this.ancestor(distance).values.set(name.lexeme, value);
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

    public getAt(distance: number, name: string): unknown {
        return this.ancestor(distance).values.get(name);
    }
}

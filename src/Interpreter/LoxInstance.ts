import { LoxClass } from "./LoxClass";
import { Token } from "../Lexer/Token";
import { RuntimeError } from "../Lox";

export class LoxInstance {
    private readonly fields = new Map<string, unknown>();

    public constructor(
        public readonly klass: LoxClass
    ) { }

    public get(name: Token): unknown {
        if (this.fields.has(name.lexeme)) {
            return this.fields.get(name.lexeme);
        }

        const method = this.klass.findMethod(name.lexeme);
        if (method != null) return method.bind(this);

        throw new RuntimeError(name, `Undefined property '${name.lexeme}'`);
    }

    public set(name: Token, value: unknown) {
        this.fields.set(name.lexeme, value);
    }

    public toString(): string {
        return this.klass.name + " instance";
    }
}

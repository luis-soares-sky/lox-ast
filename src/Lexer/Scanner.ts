import { reportError } from "../Lox";
import { TokenKeywordMap, TokenType, Token } from "./Token";

export class Scanner {
    private source: string;
    private readonly tokens: Token[] = [];

    private start = 0;
    private current = 0;
    private column = 0;
    private line = 1;

    public constructor(source: string) {
        this.source = source;
    }

    public scanTokens(): Token[] {
        this.column = 1; // Need to start at 1, otherwise the first line will always be off by one (due to all lines having "\n").

        while (!this.isAtEnd()) {
            // We are at the beginning of the next lexeme.
            this.column += (this.current - this.start);
            this.start = this.current;
            this.scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, "", <never>null, this.line, this.column));
        return this.tokens;
    }

    private scanToken() {
        const c = this.advance();
        switch (c) {
            case " ":
            case "\r":
            case "\t":
                // Ignore whitespace.
                break;

            case "\n": this.incrementLine(); break;

            case "(": this.addToken(TokenType.LEFT_PAREN); break;
            case ")": this.addToken(TokenType.RIGHT_PAREN); break;
            case "{": this.addToken(TokenType.LEFT_BRACE); break;
            case "}": this.addToken(TokenType.RIGHT_BRACE); break;
            case ",": this.addToken(TokenType.COMMA); break;
            case ".": this.addToken(TokenType.DOT); break;
            case "-": this.addToken(TokenType.MINUS); break;
            case "+": this.addToken(TokenType.PLUS); break;
            case ";": this.addToken(TokenType.SEMICOLON); break;
            case "*": this.addToken(TokenType.STAR); break;

            case "!": this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG); break;
            case "=": this.addToken(this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL); break;
            case "<": this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS); break;
            case ">": this.addToken(this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER); break;

            case "/":
                if (this.match("/")) this.scanInlineComment();
                else if (this.match("*")) this.scanBlockComment();
                else this.addToken(TokenType.SLASH);
                break;

            case "\"": this.scanString(); break;

            default:
                if (this.isDigit(c)) this.scanNumber();
                else if (this.isAlpha(c)) this.scanIdentifier();
                else reportError(this.line, this.column, `Unexpected character: ${c}`);
                break;
        }
    }

    private scanString() {
        while (this.peek() != "\"" && !this.isAtEnd()) {
            if (this.peek() == "\n") this.incrementLine();
            this.advance();
        }

        if (this.isAtEnd()) {
            reportError(this.line, this.column, "Unterminated string");
            return;
        }

        this.advance(); // The closing quote.

        const value = this.source.substring(this.start + 1, this.current - 1);
        this.addToken(TokenType.STRING, value);
    }

    private scanNumber() {
        while (this.isDigit(this.peek())) this.advance();

        // Look for a fractional part.
        if (this.peek() == "." && this.isDigit(this.peekNext())) {
            this.advance(); // Consume the ".".

            while (this.isDigit(this.peek())) this.advance();
        }

        this.addToken(TokenType.NUMBER, parseFloat(this.source.substring(this.start, this.current)));
    }

    private scanIdentifier() {
        while (this.isAlphaNumeric(this.peek())) this.advance();

        const text = this.source.substring(this.start, this.current);
        let type = TokenKeywordMap[text.toLowerCase()];
        if (type == null) type = TokenType.IDENTIFIER;
        this.addToken(type);
    }

    private scanInlineComment() {
        // An inline comment goes until the end of the line.
        while (this.peek() != "\n" && !this.isAtEnd()) this.advance();

        this.addToken(TokenType.INLINE_COMMENT, this.source.substring(this.start, this.current));
    }

    private scanBlockComment() {
        // A block comment goes until a matching "*/" is found.
        while (!this.isAtEnd()) {
            if (this.peek() == "*" && this.peekNext() == "/") {
                this.advance();
                this.advance();
                break;
            }
            this.advance();
        }

        this.addToken(TokenType.BLOCK_COMMENT, this.source.substring(this.start, this.current));
    }

    private addToken(type: TokenType, literal: unknown = null) {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line, this.column));
    }

    private advance(): string {
        return this.source.charAt(this.current++);
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) return false;
        if (this.source.charAt(this.current) != expected) return false;

        this.current++;
        return true;
    }

    private peek(): string {
        if (this.isAtEnd()) return "\0";
        return this.source.charAt(this.current);
    }

    private peekNext(): string {
        if (this.current + 1 >= this.source.length) return "\0";
        return this.source.charAt(this.current + 1);
    }

    private incrementLine() {
        this.line++;
        this.column = 0;
    }

    private isAtEnd(): boolean {
        return this.current >= this.source.length;
    }

    private isAlpha(c: string): boolean {
        const code = c.charCodeAt(0);
        return (code >= 97 && code <= 122) // a-z
            || (code >= 65 && code <= 90) // A-Z
            || code == 95; // _
    }

    private isAlphaNumeric(c: string): boolean {
        return this.isAlpha(c) || this.isDigit(c);
    }

    private isDigit(c: string): boolean {
        const code = c.charCodeAt(0);
        return code >= 48 && code <= 57; // 0-9
    }
}

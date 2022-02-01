import { LoxCallable, generateNativeEnvironment, LoxFunction } from "./Callable";
import { Environment } from "./Environment";
import * as Expr from "../Ast/Expr";
import * as Stmt from "../Ast/Stmt";
import { Token, TokenType } from "../Lexer/Token";
import { reportRuntimeError, ReturnError, RuntimeError } from "../Lox";

export class Interpreter implements Expr.Visitor<unknown>, Stmt.Visitor<void> {
    public readonly globals = generateNativeEnvironment();
    private environment = this.globals;

    public interpret(statements: Stmt.Stmt[]) {
        try {
            statements.forEach((statement) => {
                this.execute(statement);
            });
        }
        catch (e) {
            if (e instanceof RuntimeError) {
                reportRuntimeError(e);
                return;
            }
            throw e;
        }
    }

    public visitAssignExpr(expr: Expr.Assign): unknown {
        const value = this.evaluate(expr.value);
        this.environment.assign(expr.name, value);
        return value;
    }

    public visitBinaryExpr(expr: Expr.Binary): unknown {
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);

        switch (expr.operator.type) {
            case TokenType.BANG_EQUAL:
                return !this.isEqual(left, right);
            case TokenType.EQUAL_EQUAL:
                return this.isEqual(left, right);
            case TokenType.GREATER:
                this.checkNumberOperands(expr.operator, left, right);
                return <number>left > <number>right;
            case TokenType.GREATER_EQUAL:
                this.checkNumberOperands(expr.operator, left, right);
                return <number>left >= <number>right;
            case TokenType.LESS:
                this.checkNumberOperands(expr.operator, left, right);
                return <number>left < <number>right;
            case TokenType.LESS_EQUAL:
                this.checkNumberOperands(expr.operator, left, right);
                return <number>left <= <number>right;
            case TokenType.MINUS:
                this.checkNumberOperands(expr.operator, left, right);
                return <number>left - <number>right;
            case TokenType.PLUS:
                if (typeof left == "number" && typeof right == "number") return left + right;
                if (typeof left == "string" || typeof right == "string") return this.stringify(left) + this.stringify(right);
                throw new RuntimeError(expr.operator, "Operands must be numbers or strings");
            case TokenType.SLASH:
                this.checkNumberOperands(expr.operator, left, right);
                if (<number>right != 0) return <number>left / <number>right;
                throw new RuntimeError(expr.operator, "Cannot divide by zero");
            case TokenType.STAR:
                this.checkNumberOperands(expr.operator, left, right);
                return <number>left * <number>right;
        }

        // Unreachable.
        return null;
    }

    public visitCallExpr(expr: Expr.Call): unknown {
        const callee = this.evaluate(expr.callee);
        const args = expr.args.map((arg) => this.evaluate(arg));

        if (!(callee instanceof LoxCallable)) {
            throw new RuntimeError(expr.paren, "Can only call functions and classes");
        }

        const fun: LoxCallable = <LoxCallable>callee;
        if (args.length != fun.arity()) {
            throw new RuntimeError(expr.paren, `Expected ${fun.arity()} arguments but got ${args.length}`);
        }

        return fun.call(this, args);
    }

    public visitGroupingExpr(expr: Expr.Grouping): unknown {
        return this.evaluate(expr.expression);
    }

    public visitLiteralExpr(expr: Expr.Literal): unknown {
        return expr.value;
    }

    public visitLogicalExpr(expr: Expr.Logical): unknown {
        const left = this.evaluate(expr.left);

        if (expr.operator.type == TokenType.OR) {
            if (this.isTruthy(left)) return left;
        }
        else {
            if (!this.isTruthy(left)) return left;
        }

        return this.evaluate(expr.right);
    }

    public visitUnaryExpr(expr: Expr.Unary): unknown {
        const right = this.evaluate(expr.right);

        switch (expr.operator.type) {
            case TokenType.BANG:
                return !this.isTruthy(right);
            case TokenType.MINUS:
                this.checkNumberOperand(expr.operator, right);
                return -<number>right;
        }

        // Unreachable.
        return null;
    }

    public visitVariableExpr(expr: Expr.Variable): unknown {
        return this.environment.get(expr.name);
    }

    public visitBlockStmt(stmt: Stmt.Block): void {
        this.executeBlock(stmt.statements, new Environment(this.environment));
    }

    public visitExpressionStmt(stmt: Stmt.Expression): void {
        this.evaluate(stmt.expression);
    }

    public visitFunStmt(stmt: Stmt.Fun): void {
        const fun = new LoxFunction(stmt);
        this.environment.define(stmt.name.lexeme, fun);
    }

    public visitIfStmt(stmt: Stmt.If): void {
        if (this.isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.thenBranch);
        }
        else if (stmt.elseBranch != null) {
            this.execute(stmt.elseBranch);
        }
    }

    public visitPrintStmt(stmt: Stmt.Print): void {
        const value = this.evaluate(stmt.expression);
        console.log(this.stringify(value));
    }

    public visitReturnStmt(stmt: Stmt.Return): void {
        const value = stmt.value != null
            ? this.evaluate(stmt.value)
            : null;
        throw new ReturnError(value);
    }

    public visitVarStmt(stmt: Stmt.Var): void {
        let value = null;
        if (stmt.initializer != null) {
            value = this.evaluate(stmt.initializer);
        }

        this.environment.define(stmt.name.lexeme, value);
    }

    public visitWhileStmt(stmt: Stmt.While): void {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            this.execute(stmt.body);
        }
    }

    // http://craftinginterpreters.com/statements-and-state.html#statements
    // http://craftinginterpreters.com/statements-and-state.html#scope

    public execute(stmt: Stmt.Stmt) {
        stmt.accept(this);
    }

    public executeBlock(statements: Stmt.Stmt[], environment: Environment) {
        const previous = this.environment;
        try {
            this.environment = environment;

            statements.forEach((statement) => {
                this.execute(statement);
            });
        }
        finally {
            this.environment = previous;
        }
    }

    // http://craftinginterpreters.com/evaluating-expressions.html

    private evaluate(expr: Expr.Expr): unknown {
        return expr.accept(this);
    }

    private checkNumberOperand(operator: Token, operand: unknown) {
        if (typeof operand == "number") return;
        throw new RuntimeError(operator, "Operand must be a number");
    }

    private checkNumberOperands(operator: Token, left: unknown, right: unknown) {
        if (typeof left == "number" && typeof right == "number") return;
        throw new RuntimeError(operator, "Operands must be numbers");
    }

    private isEqual(a: unknown, b: unknown): boolean {
        return a === b; // Lox doesn't do implicit conversions so we use the strict equality operator.
    }

    private isTruthy(value: unknown): boolean {
        if (value == null || value == undefined) return false;
        if (typeof value == "boolean") return value;
        return true;
    }

    private stringify(value: unknown): string {
        if (value == null || value == undefined) return "nil";
        if (typeof value == "string") return value;
        return String(value);
    }
}

import { Binary, Expr, Grouping, Literal, Unary, Visitor as ExprVisitor } from "../Ast/Expr";
import { Expression, Print, Stmt, Visitor as StmtVisitor } from "../Ast/Stmt";
import { Token, TokenType } from "../Lexer/Token";
import { reportRuntimeError, RuntimeError } from "../Lox";

export class Interpreter implements ExprVisitor<unknown>, StmtVisitor<void> {
    public interpret(statements: Stmt[]) {
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

    public visitBinaryExpr(expr: Binary): unknown {
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

    public visitGroupingExpr(expr: Grouping): unknown {
        return this.evaluate(expr.expression);
    }

    public visitLiteralExpr(expr: Literal): unknown {
        return expr.value;
    }

    public visitUnaryExpr(expr: Unary): unknown {
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

    public visitExpressionStmt(stmt: Expression) {
        this.evaluate(stmt.expression);
    }

    public visitPrintStmt(stmt: Print) {
        const value = this.evaluate(stmt.expression);
        console.log(this.stringify(value));
    }

    // http://craftinginterpreters.com/statements-and-state.html#statements

    private execute(stmt: Stmt) {
        stmt.accept(this);
    }

    // http://craftinginterpreters.com/evaluating-expressions.html

    private evaluate(expr: Expr): unknown {
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

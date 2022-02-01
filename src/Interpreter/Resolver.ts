import * as Expr from "../Ast/Expr";
import * as Stmt from "../Ast/Stmt";
import { Token } from "../Lexer/Token";
import { reportError } from "../Lox";
import { Interpreter } from "./Interpreter";

export enum FunctionType { NONE, FUNCTION }

export class Resolver implements Expr.Visitor<void>, Stmt.Visitor<void> {
    private readonly scopes: Map<string, boolean>[] = [];
    private currentFunction = FunctionType.NONE;

    public constructor(
        private readonly interpreter: Interpreter
    ) { }

    public visitBlockStmt(stmt: Stmt.Block): void {
        this.beginScope();
        this.resolveStatementList(stmt.statements);
        this.endScope();
    }

    public visitExpressionStmt(stmt: Stmt.Expression): void {
        this.resolveExpression(stmt.expression);
    }

    public visitFunStmt(stmt: Stmt.Fun): void {
        this.declare(stmt.name);
        this.define(stmt.name);

        this.resolveFunction(stmt, FunctionType.FUNCTION);
    }

    public visitIfStmt(stmt: Stmt.If): void {
        this.resolveExpression(stmt.condition);
        this.resolveStatement(stmt.thenBranch);
        if (stmt.elseBranch != null) this.resolveStatement(stmt.elseBranch);
    }

    public visitPrintStmt(stmt: Stmt.Print): void {
        this.resolveExpression(stmt.expression);
    }

    public visitReturnStmt(stmt: Stmt.Return): void {
        if (this.currentFunction == FunctionType.NONE) {
            reportError(stmt.keyword.line, stmt.keyword.column, "", "Can't return from top-level code");
        }

        if (stmt.value != null) this.resolveExpression(stmt.value);
    }

    public visitVarStmt(stmt: Stmt.Var): void {
        this.declare(stmt.name);
        if (stmt.initializer != null) {
            this.resolveExpression(stmt.initializer);
        }
        this.define(stmt.name);
    }

    public visitWhileStmt(stmt: Stmt.While): void {
        this.resolveExpression(stmt.condition);
        this.resolveStatement(stmt.body);
    }

    public visitAssignExpr(expr: Expr.Assign): void {
        this.resolveExpression(expr.value);
        this.resolveLocal(expr, expr.name);
    }

    public visitBinaryExpr(expr: Expr.Binary): void {
        this.resolveExpression(expr.left);
        this.resolveExpression(expr.right);
    }

    public visitCallExpr(expr: Expr.Call): void {
        this.resolveExpression(expr.callee);

        expr.args.forEach((argument) => {
            this.resolveExpression(argument);
        });
    }

    public visitGroupingExpr(expr: Expr.Grouping): void {
        this.resolveExpression(expr.expression);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public visitLiteralExpr(expr: Expr.Literal): void {
        return;
    }

    public visitLogicalExpr(expr: Expr.Logical): void {
        this.resolveExpression(expr.left);
        this.resolveExpression(expr.right);
    }

    public visitUnaryExpr(expr: Expr.Unary): void {
        this.resolveExpression(expr.right);
    }

    public visitVariableExpr(expr: Expr.Variable): void {
        if (this.scopes.length > 0 && this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === false) {
            reportError(expr.name.line, expr.name.column, "", "Can't read local variable in its own initializer");
        }

        this.resolveLocal(expr, expr.name);
    }

    private beginScope(): void {
        this.scopes.push(new Map());
    }

    private endScope(): void {
        this.scopes.pop();
    }

    private declare(name: Token): void {
        if (this.scopes.length < 1) return;

        const scope = this.scopes[this.scopes.length - 1];
        if (scope.has(name.lexeme)) {
            reportError(name.line, name.column, "", `A variable '${name.lexeme}' already exists in this scope`);
        }
        scope.set(name.lexeme, false);
    }

    private define(name: Token): void {
        if (this.scopes.length < 1) return;

        const scope = this.scopes[this.scopes.length - 1];
        scope.set(name.lexeme, true);
    }

    public resolveStatementList(statements: Stmt.Stmt[]): void {
        statements.forEach((statement) => {
            this.resolveStatement(statement);
        });
    }

    private resolveStatement(stmt: Stmt.Stmt): void {
        stmt.accept(this);
    }

    private resolveFunction(fun: Stmt.Fun, type: FunctionType): void {
        const enclosingFunction = this.currentFunction;
        this.currentFunction = type;

        this.beginScope();
        fun.params.forEach((param) => {
            this.declare(param);
            this.define(param);
        });
        this.resolveStatementList(fun.body);
        this.endScope();

        this.currentFunction = enclosingFunction;
    }

    private resolveExpression(expr: Expr.Expr): void {
        expr.accept(this);
    }

    private resolveLocal(expr: Expr.Expr, name: Token): void {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name.lexeme)) {
                this.interpreter.resolveLocal(expr, this.scopes.length - 1 - i);
                return;
            }
        }
    }
}

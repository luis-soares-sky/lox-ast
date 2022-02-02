import * as Expr from "../Ast/Expr";
import * as Stmt from "../Ast/Stmt";
import { Token } from "../Lexer/Token";
import { returnTokenError } from "../Lox";
import { Interpreter } from "./Interpreter";

export enum ClassType { NONE, CLASS, SUBCLASS }
export enum FunctionType { NONE, FUNCTION, INITIALIZER, METHOD }

export class Resolver implements Expr.Visitor<void>, Stmt.Visitor<void> {
    private readonly scopes: Map<string, boolean>[] = [];
    private currentClass = ClassType.NONE;
    private currentFunction = FunctionType.NONE;

    public constructor(
        private readonly interpreter: Interpreter
    ) { }

    public visitBlockStmt(stmt: Stmt.Block): void {
        this.beginScope();
        this.resolveStatementList(stmt.statements);
        this.endScope();
    }

    public visitClassStmt(stmt: Stmt.Class): void {
        const enclosingClass = this.currentClass;
        this.currentClass = ClassType.CLASS;

        this.declare(stmt.name);
        this.define(stmt.name);

        if (stmt.superclass != null) {
            if (stmt.name.lexeme == stmt.superclass.name.lexeme) {
                returnTokenError(stmt.superclass.name, "A class can't inherit from itself");
            }

            this.currentClass = ClassType.SUBCLASS;
            this.resolveExpression(stmt.superclass);
        }

        if (stmt.superclass != null) {
            this.beginScope();
            this.scopes[this.scopes.length - 1].set("super", true);
        }

        this.beginScope();
        this.scopes[this.scopes.length - 1].set("this", true);
        stmt.methods.forEach((method) => {
            let declaration = FunctionType.METHOD;
            if (method.name.lexeme == "init") {
                declaration = FunctionType.INITIALIZER;
            }
            this.resolveFunction(method, declaration);
        });
        this.endScope();

        if (stmt.superclass != null) {
            this.endScope();
        }

        this.currentClass = enclosingClass;
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
            returnTokenError(stmt.keyword, "Can't return from top-level code");
        }

        if (stmt.value != null) {
            if (this.currentFunction == FunctionType.INITIALIZER) {
                returnTokenError(stmt.keyword, "Can't return a value from an initializer");
            }

            this.resolveExpression(stmt.value);
        }
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

    public visitGetExpr(expr: Expr.Get): void {
        this.resolveExpression(expr.object);
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

    public visitSetExpr(expr: Expr.Set): void {
        this.resolveExpression(expr.value);
        this.resolveExpression(expr.object);
    }

    public visitSuperExpr(expr: Expr.Super): void {
        if (this.currentClass == ClassType.NONE) {
            returnTokenError(expr.keyword, "Can't use 'super' outside of a class");
        }
        else if (this.currentClass != ClassType.SUBCLASS) {
            returnTokenError(expr.keyword, "Can't use 'super' in a class with no superclass");
        }

        this.resolveLocal(expr, expr.keyword);
    }

    public visitThisExpr(expr: Expr.This): void {
        if (this.currentClass == ClassType.NONE) {
            returnTokenError(expr.keyword, "Can't use 'this' outside of a class");
            return;
        }

        this.resolveLocal(expr, expr.keyword);
    }

    public visitUnaryExpr(expr: Expr.Unary): void {
        this.resolveExpression(expr.right);
    }

    public visitVariableExpr(expr: Expr.Variable): void {
        if (this.scopes.length > 0 && this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === false) {
            returnTokenError(expr.name, "Can't read local variable in its own initializer");
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
            returnTokenError(name, `A variable '${name.lexeme}' already exists in this scope`);
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

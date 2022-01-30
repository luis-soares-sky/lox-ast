import { Binary, Expr, Grouping, Literal, Unary, Visitor } from "./Expr";

export class ExprAstPrinter implements Visitor<string> {
    public print(expr: Expr): string {
        return expr.accept(this);
    }

    private parenthesize(name: string, ...exprs: Expr[]): string {
        const parts = exprs.map((expr) => expr.accept(this)).join(" ");
        return `(${name} ${parts})`;
    }

    public visitBinaryExpr(expr: Binary): string {
        return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
    }

    public visitGroupingExpr(expr: Grouping): string {
        return this.parenthesize("group", expr.expression);
    }

    public visitLiteralExpr(expr: Literal): string {
        if (expr.value != null) return (<{ toString(): string }>expr.value).toString();
        return "nil";
    }

    public visitUnaryExpr(expr: Unary): string {
        return this.parenthesize(expr.operator.lexeme, expr.right);
    }
}

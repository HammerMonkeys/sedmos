import * as math from "mathjs";
import latexToAscii from "$lib/utils/latexToAscii";
import {
  BadLatexSyntax,
  CircularDependency,
  ExprEvalError,
  Not2DGraphable,
  ReservedSymbol
} from "$lib/numerical/exprEvalError";

type Visual = "xcurve" | "ycurve" | "xfield" | "yfield" | "none";
export type Scope = Map<string, number>;

export class Expression {
  public readonly latex: string;
  private _compiled?: math.EvalFunction;
  // such as "id(x) = 3x", or "id = 4"
  public id?: string;
  // "y = x" type ycurve, or inferred if "f = a + b", or none if "a = 2"
  public visual?: Visual = "none";
  // "f(_) = deps"
  public deps: Set<string> = new Set();
  // "f(args) = 1"
  public args: Set<string> = new Set();

  constructor(latex: string, id?: string) {
    this.latex = latex;
    const ascii = latexToAscii(latex);
    let ast: math.MathNode;

    try {
      ast = math.parse(ascii);
      ast = this._meta(ast);
      this._compiled = ast.compile();
    } catch (SyntaxError) {
      throw new BadLatexSyntax();
    }

    this.id = id ?? this.id;
  }

  private _meta(root: math.MathNode) {
    let name: string | undefined;
    let deps = new Set<string>();
    let args = new Set<string>();
    let visual: Visual | undefined;
    let traversalHead = root;

    switch (root.type) {
      case "FunctionAssignmentNode": {
        const assnNode = root as math.FunctionAssignmentNode;
        name = assnNode.name;
        args = new Set(assnNode.params);
        traversalHead = assnNode.expr;
        break;
      }
      case "AssignmentNode": {
        const assnNode = root as math.AssignmentNode;
        name = assnNode.name;
        traversalHead = assnNode.value;
        break;
      }
    }

    switch (name) {
      case "y":
        visual = "ycurve";
        root = traversalHead;
        break;
      case "x":
        visual = "xcurve";
        root = traversalHead;
        break;
      case "y'":
        visual = "yfield";
        root = traversalHead;
        break;
      case "x'":
        visual = "xfield";
        root = traversalHead;
        break;
      default:
        this.id = name;
        break;
    }

    // exclusive or
    if (visual) {
      if (root.type == "FunctionAssignmentNode") {
        const hasX = args.has("x")
        const hasY = args.has("y")

        if (args.size > 1) throw new Not2DGraphable();
        if (args.size == 1) {
          if (!hasX && !hasY) throw new ReservedSymbol(name!);
          if (visual == "xcurve" && !hasY) throw new CircularDependency(name!);
          if (visual == "ycurve" && !hasX) throw new CircularDependency(name!);
        }
      }
    }

    traversalHead.traverse((node) => {
      if (node.type !== "SymbolNode") return;
      const symNode = node as math.SymbolNode;
      if (args.has(symNode.name)) return;
      if (name && symNode.name === name) return;
      deps.add(symNode.name);
    });

    if (!visual) {
      if (args.size == 0) {
        if (!('x' in deps || 'y' in deps)) {
          visual = "none";
        }
      }
    }

    for (const dep of deps) {
      if (dep === "y'" || dep === "x'") {
        throw new ExprEvalError("Only explicit differential equations in y' or x' are supported");
      }
    }

    this.deps = deps;
    this.args = args;
    this.visual = visual;
    return root;
  }

  public eval(scope: Scope) {
    return this._compiled?.evaluate(scope);
  }
}
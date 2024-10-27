import * as math from "mathjs";
import latexToAscii from "$lib/utils/latexToAscii";
import {
  BadLatexSyntax,
  CircularDependency,
  ExprEvalError, ImplicitFieldEquation,
  Not2DGraphable,
  ReservedSymbol
} from "$lib/numerical/exprEvalError";

type Visual = "xcurve" | "ycurve" | "xfield" | "yfield" | "none";
export type Scope = Map<string, number>;

function extendMathJS() {
  const isAlphaOriginal = math.parse.isAlpha;
  math.parse.isAlpha = function (c, cPrev, cNext) {
    return isAlphaOriginal(c, cPrev, cNext) || c === "'";
  };
}
extendMathJS();

export class Expression {
  public readonly latex: string;
  private _compiled?: math.EvalFunction;
  // such as "id(x) = 3x", or "id = 4"
  public id?: string;
  public requestedVisual?: Visual;
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
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
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

    // if (name == "y" || name == "x") {
    //   if (name == 'y') {
    //     if (deps.size == 1 && !deps.has('x')) throw new CircularDependency(name);
    //       if (deps.has('x')) yForm = true;
    //     }
    //   } else if (name == 'x') {
    //     if (deps.size == 0) xForm = true;
    //     else if (deps.size == 1) {
    //       if (deps.has('y')) xForm = true;
    //     }
    //   }
    //
    //   // confirm directly graphable functions (without dependency evaluation)
    //   // are in form y(x) or x(y)
    //   if (root.type == "FunctionAssignmentNode") {
    //     if (args.size > 1) throw new Not2DGraphable();
    //     if (args.size == 1) {
    //       const argX = args.has('x');
    //       const argY = args.has('y');
    //
    //       if (!argX && !argY) throw new ReservedSymbol(name!);
    //       if (yForm && argY) throw new CircularDependency(name!);
    //       if (xForm && argX) throw new CircularDependency(name!);
    //     }
    //   }
    // }

    traversalHead.traverse((node) => {
      if (node.type !== "SymbolNode") return;
      const symNode = node as math.SymbolNode;
      if (args.has(symNode.name)) return;
      if (name && symNode.name === name) return;
      deps.add(symNode.name);
    });

    for (const dep of deps) {
      if (dep === "y'" || dep === "x'") {
        throw new ImplicitFieldEquation();
      }
    }

    this.deps = deps;
    this.args = args;
    this.requestedVisual = visual;
    return root;
  }

  public eval(scope: Scope) {
    return this._compiled?.evaluate(scope);
  }
}
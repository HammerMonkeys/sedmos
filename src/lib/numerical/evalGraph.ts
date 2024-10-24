import * as math from "mathjs";
import latexToAscii from "../utils/latexToAscii";
import {CircularDependencyError, ExprEvalError} from "$lib/numerical/exprEvalError";
import {DiGraph, DiGraphNode} from "$lib/numerical/diGraph";

// TODO: this needs string interning

type Visual = "xcurve" | "ycurve" | "field" | "none";
type Scope = Map<string, number>;

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
  // "y = x" type ycurve, or inferred if "f = a + b", or none if "a = 2"
  public visual?: Visual = "none";
  // "f(_) = deps"
  public deps: Set<string> = new Set();
  // "f(args) = 1"
  public args: Set<string> = new Set();

  constructor(latex: string, id?: string) {
    this.latex = latex;
    const ascii = latexToAscii(latex);
    const ast = math.parse(ascii);
    this._compiled = math.compile(this.latex);
    this._meta(ast);
    this.id = id ?? this.id;
  }

  private _meta(root: math.MathNode) {
    let name: string | undefined;
    let deps = new Set<string>();
    let args = new Set<string>();
    let traversalHead = root;

    switch (root.type) {
      case "FunctionAssignmentNode":
      {
        const assnNode = root as math.FunctionAssignmentNode;
        name = assnNode.name;
        args = new Set(assnNode.params);
        traversalHead = assnNode.expr;
        break;
      }
      case "AssignmentNode":
      {
        const assnNode = root as math.AssignmentNode;
        name = assnNode.name;
        traversalHead = assnNode.value;
        break;
      }
    }

    switch (name) {
      case "y":
        this.visual = "ycurve";
        break;
      case "x":
        this.visual = "xcurve";
        break;
      case "x'":
      case "y'":
        this.visual = "field";
        break;
      default:
        this.id = name;
      break;
    }

    traversalHead.traverse((node) => {
      if (node.type !== "SymbolNode") return;
      const symNode = node as math.SymbolNode;
      if (args.has(symNode.name)) return;
      if (name && symNode.name === name) return;
      deps.add(symNode.name);
    });

    if (!this.visual) {
      if (args.size == 0) {
        if (!('x' in deps || 'y' in deps)) {
          this.visual = "none";
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
  }

  public eval(scope: Scope) {
    return this._compiled?.evaluate(scope);
  }
}

class EvalState {
  public readonly expr?: Expression;
  public scope?: Scope;
  public value: any;

  constructor(expr?: Expression) {
    this.expr = expr;
  }

  public evalWith(parentScopes: Scope[]) {
    if (!this.expr) {
      return;
    }

    this.scope = parentScopes
      .reduce((acc, curr) =>
          new Map([...acc, ...curr!]),
        new Map());
    this.value = this.expr?.eval(this.scope);
  }
}

export class EvalGraph {
  private _depGraph: DiGraph<EvalState> = new DiGraph();

  public specify(id: string, value: number) {
    const state = new EvalState();
    state.scope = new Map([[id, value]]);
    state.value = value;
    this._depGraph.set(id, state);
    this._refresh(id);
  }

  public learn(expr: Expression) {
    const id = expr.id;
    const deps = expr.deps;

    if (!id) {
      throw new Error("Expression must have an id");
    }

    const oldDeps = this._depGraph.get(id)?.value.expr?.deps;
    if (oldDeps) {
      for (const dep of oldDeps) {
        this._depGraph.remove_edge(dep, id);
      }
    }

    this._depGraph.set(id, new EvalState(expr));

    for (const dep of deps) {
      if (!this._depGraph.has(dep)) {
        this._depGraph.set(dep, new EvalState());
      }

      this._depGraph.add_edge(dep, id);
    }

    if (this._depGraph.detect_cycle(id)) {
      throw new CircularDependencyError();
    }

    this._refresh(id);
  }

  public forget(id: string) {
    const node = this._depGraph.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    node.value = new EvalState();
    this._refresh(id);
    this._depGraph.remove(id);
  }

  private _refresh(id: string) {
    function refresh_recursive(node: DiGraphNode<EvalState>) {
      let parentScopes = [];

      for (const parent of node.parents) {
        const parentState = parent.value;
        parentScopes.push(parentState.scope);
      }

      const state = node.value;

      if (!parentScopes.includes(undefined)) {
        // @ts-ignore
        state.evalWith(parentScopes);
      } else if (state.scope !== undefined) {
        state.scope = undefined;
        state.value = undefined;
      }

      for (const child of node.children) {
        refresh_recursive(child);
      }
    }

    const node = this._depGraph.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    refresh_recursive(node);
  }

  public get(id: string) {
    const node = this._depGraph.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    return node.value.value;
  }
}
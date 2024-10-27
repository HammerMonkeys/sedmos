import * as math from "mathjs";
import {CircularDependency} from "$lib/numerical/exprEvalError";
import {DiGraph, DiGraphNode} from "$lib/numerical/diGraph";
import {Expression, type Scope} from "$lib/numerical/expression";

// TODO: this needs string interning

function extendMathJS() {
  const isAlphaOriginal = math.parse.isAlpha;
  math.parse.isAlpha = function (c, cPrev, cNext) {
    return isAlphaOriginal(c, cPrev, cNext) || c === "'";
  };
}
extendMathJS();

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
    this.value = this.expr!.eval(this.scope);
  }
}

export class EvalGraph {
  private _depGraph: DiGraph<EvalState> = new DiGraph();

  public specify(id: string, value: number) {
    const state = new EvalState();
    state.scope = new Map([[id, value]]);
    state.value = value;
    this._depGraph.set(id, state);
    return this._refresh(id);
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
      throw new CircularDependency(id);
    }

    this._inferVisualType(id);
    return this._refresh(id);
  }

  public forget(id: string) {
    const node = this._depGraph.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    node.value = new EvalState();
    const hot = this._refresh(id);
    // TODO: should NOT be removing from digraph, only erase eval states
    this._depGraph.remove(id);
    return hot;
  }

  private _refresh(id: string) {
    // a set of ids that have been updated in the current refresh
    const hot = new Set<string>();
    hot.add(id);

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

        if (state.expr && state.expr!.id) {
          hot.add(state.expr!.id);
        }
      } else {
        if (state.scope !== undefined) {
          state.scope = undefined;
          state.value = undefined;

          if (state.expr && state.expr!.id) {
            hot.add(state.expr!.id);
          }
        }
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
    // returns the set of ids that have been updated
    // so that the UI can update only those
    return hot;
  }

  public get(id: string) {
    const node = this._depGraph.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    return node.value.value;
  }

  private _inferVisualType(id: string) {
    const expr = this._depGraph.get(id)?.value.expr;
    if (!expr) return;
    const vis = expr.requestedVisual;
    if (vis) return;
  }

  public getVisualType(id: string) {
    const node = this._depGraph.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    const vis = node.value.expr?.requestedVisual;

    if (!vis) {
      throw new Error(`id ${id} has no visual type; impl inference`);
    }

    return vis;
  }
}
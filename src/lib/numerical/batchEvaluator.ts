import {EvalGraph} from "$lib/numerical/evalGraph";
import type {int, vec2, vec3} from "$lib/types";
import {DuplicateSymbol, ExprEvalError} from "$lib/numerical/exprEvalError";
import {XYMap} from "$lib/numerical/xyMap";
import {SymbolTable} from "$lib/numerical/symbolTable";
import {Expression} from "$lib/numerical/expression";

export class BatchEvaluator {
  public ignoreSyntaxErrors = false;
  public chunkSize: int;
  public curveSubdivis: int;
  public fieldSubdivis: int;
  private _chunks: XYMap<Chunk> = new XYMap();
  private _symbolTable: SymbolTable = new SymbolTable();
  private _exps: Expression[] = [];

  constructor(ignoreSyntaxErrors: boolean = false, chunkSize: int = 100, curveSubdivis: int = 300, fieldSubdivis: int = 50) {
    this.ignoreSyntaxErrors = ignoreSyntaxErrors;
    this.chunkSize = chunkSize;
    this.curveSubdivis = curveSubdivis;
    this.fieldSubdivis = fieldSubdivis;
  }

  public remove(position: int) {
    const oldExpr = this._exps.at(position);
    if (oldExpr) this._removeFromChunks(oldExpr);
    this._exps.splice(position, 1);
  }

  public add(latex: string) {
    this.update(this._exps.length, latex);
  }

  public update(position: int, latex: string) {
    let newExpr: Expression | undefined;

    try {
      newExpr = new Expression(latex);
    } catch (e: unknown) {
      if (!(e instanceof ExprEvalError)) throw e;

      if (!this.ignoreSyntaxErrors) {
        throw e;
      }

      const oldExpr = this._exps.at(position);
      if (oldExpr) this._removeFromChunks(oldExpr);
      return;
    }

    if (newExpr.id && this._symbolTable.has(newExpr.id)) {
      throw new DuplicateSymbol(newExpr.id);
    }

    let newId;

    if (newExpr.id) {
      newId = newExpr.id;
      this._symbolTable.add(newId);
    } else {
      newId = this._symbolTable.newAnonymous();
      newExpr.id = newId;
    }

    const oldExpr = this._exps.at(position);
    this._exps[position] = newExpr;

    if (oldExpr) {
      const oldId = oldExpr.id!;

      if (oldId !== newId) {
        this._removeFromChunks(oldExpr);
      }
    }

    this._addToChunks(newExpr);
  }

  private _removeFromChunks(expr: Expression) {
    const id = expr.id!;
    this._symbolTable.remove(id);

    for (const chunk of this._chunks.values()) {
      chunk.learn(expr);
    }
  }

  private _addToChunks(expr: Expression) {
    for (const chunk of this._chunks.values()) {
      chunk.learn(expr);
    }
  }

  public chunkCoord(coord: vec2): vec2 {
    return [
      Math.floor(coord[0] / this.chunkSize),
      Math.floor(coord[1] / this.chunkSize)
    ];
  }

  public chunkCoordsInRegion(min: vec2, max: vec2): vec2[] {
    const results: vec2[] = [];
    const chunkMin = this.chunkCoord(min);
    const chunkMax = this.chunkCoord(max);

    for (let x = chunkMin[0]; x <= chunkMax[0]; x++) {
      for (let y = chunkMin[1]; y <= chunkMax[1]; y++) {
        results.push([x, y]);
      }
    }

    return results;
  }

  public getChunk(chunkOrigin: vec2): GraphState[] {
    let chunk = this._chunks.get(...chunkOrigin);

    if (!chunk) {
      chunk = this._newChunk(chunkOrigin);
    }

    // all expressions have ids
    let ids = this._exps.map(expr => expr.id!);
    const results: GraphState[] = [];

    for (const id of ids) {
      const state = chunk.get(id);
      results.push(state);
    }

    return results;
  }

  private _newChunk(chunkOrigin: vec2): Chunk {
    // TODO: maintain a global EvalGraph and fork it for each chunk
    let chunk = new Chunk(chunkOrigin, new EvalGraph(), this.chunkSize, this.curveSubdivis, this.fieldSubdivis);
    this._chunks.set(...chunkOrigin, chunk);

    for (const expr of this._exps) {
      chunk.learn(expr);
    }

    return chunk;
  }
}

type GraphState = vec2[] | vec3[];

class Chunk {
  // eval graph included separately in each chunk to enable parallelization later
  public origin: vec2;
  // TODO: revise constants
  public size: int;
  public curveSubdivis: int;
  public fieldSubdivis: int;
  private _evalGraph: EvalGraph;
  private _state: Map<string, GraphState> = new Map();

  public constructor(origin: vec2, evalGraph: EvalGraph, chunkSize: int, curveSubdivis: int = 300, fieldSubdivis: int = 50) {
    this.origin = origin;
    this._evalGraph = evalGraph;
    this.size = chunkSize;
    this.curveSubdivis = curveSubdivis;
    this.fieldSubdivis = fieldSubdivis;
  }

  public learn(expr: Expression) {
    const hot = this._evalGraph.learn(expr).values();
    this._recomputeState(hot);
  }

  public forget(expr: Expression) {
    const hot = this._evalGraph.forget(expr.id!).values();
    this._recomputeState(hot);
  }

  private _recomputeState(hot: Iterable<string>) {
    const idByType = new Map<string, string[]>();

    for (const id of hot) {
      const type = this._evalGraph.getVisualType(id);

      if (!idByType.has(type)) {
        idByType.set(type, []);
      }

      idByType.get(type)!.push(id);
    }

    const results = [];
    results.push(this._evalCurves(0, idByType.get("ycurve") ?? []));
    results.push(this._evalCurves(1, idByType.get("xcurve") ?? []));
    results.push(this._evalFields(false, idByType.get("yfield") ?? []));
    results.push(this._evalFields(true, idByType.get("xfield") ?? []));

    for (const result of results) {
      for (const [id, points] of result) {
        this._state.set(id, points);
      }
    }
  }

  private _evalCurves(indDim: 0 | 1, ids: string[]): Map<string, vec2[]> {
    const results: Map<string, vec2[]> = new Map();

    for (const id of ids) {
      results.set(id, []);
    }

    if (ids.length === 0) return results;

    const delta = this.size / this.curveSubdivis;
    const dimSymbol = indDim ? "y" : "x";

    for (let step = 0; step < this.curveSubdivis; step++) {
      const indValue = step * delta + this.origin[indDim];
      this._evalGraph.specify(dimSymbol, indValue);

      for (const id of ids) {
        const depValue = this._evalGraph.get(id);
        const point = [0, 0] as vec2;
        point[indDim] = indValue;
        point[1 - indDim] = depValue;
        results.get(id)!.push(point);
      }
    }

    return results;
  }

  private _evalFields(doReciprocal: boolean, ids: string[]): Map<string, vec3[]> {
    const results: Map<string, vec3[]> = new Map();

    for (const id of ids) {
      results.set(id, []);
    }

    if (ids.length === 0) return results;

    const delta = this.size / this.fieldSubdivis;

    for (let xStep = 0; xStep < this.fieldSubdivis; xStep++) {
      const x = xStep * delta + this.origin[0];
      this._evalGraph.specify("x", x);

      for (let yStep = 0; yStep < this.fieldSubdivis; yStep++) {
        const y = yStep * delta + this.origin[1];
        this._evalGraph.specify("y", y);

        for (const id of ids) {
          const value = this._evalGraph.get(id);

          if (doReciprocal) {
            results.get(id)!.push([x, y, 1 / value]);
          } else {
            results.get(id)!.push([x, y, value]);
          }
        }
      }
    }

    return results;
  }

  public get(id: string): GraphState {
    if (!this._state.has(id)) {
      throw new Error("That id has not been learned yet");
    }

    return this._state.get(id)!;
  }
}
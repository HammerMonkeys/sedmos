import * as math from "mathjs";
import latexToAscii from "./utils/latexToAscii";
import log from "./log";
import { Solver } from "odex";

// All dependencies are parsed as "symbols"
interface Dependencies {
  dependencies: string[];
  expId: number;
}

type HotVar = "x" | "y" | "t";
type VisualType = "value" | "curve" | "field" | "novisual";
interface Metadata {
  type: VisualType;
  dependentVar?: HotVar;
  hot: boolean; // hot means it needs re-eval per xy coordinate
}

// todo buff universe
export interface Universe {
  metadata: Metadata[];
  state: Array<number | [number | undefined, number | undefined]>;
  odeInitialConditions(y0: number, t0: number): void;
  evalWith(indepVar: number, depVar: number, vectorFields?: boolean): this;
}

class CircularDependencyError extends Error {
  public affected_ids: number[];
  public circular_vars: string[];
  constructor(affectedIds: number[], circularVars: string[]) {
    if (circularVars)
      super(`Circular dependency detected: ${circularVars.join(", ")}`);
    else super("Circular dependency detected");

    this.affected_ids = affectedIds;
    this.circular_vars = circularVars;
  }
}

// todo in JS, error vs exception?
class UnsupportedFeatureError extends Error {
  public affected_id: number;
  public feature: string;
  constructor(affectedId: number, feature: string) {
    super(`Unsupported feature: ${feature}`);
    this.affected_id = affectedId;
    this.feature = feature;
  }
}

function extendMathJS() {
  const isAlphaOriginal = math.parse.isAlpha;
  math.parse.isAlpha = function (c, cPrev, cNext) {
    return isAlphaOriginal(c, cPrev, cNext) || c === "'";
  };
}
extendMathJS();

export function buildUniverse(inputData: string[]) {
  // TODO remove
  log("\n\n\n\n");

  // todo remove
  const exampleInputData = [
    "a=2",
    "b=12",
    "c=18",
    "",
    "d = 2\\cdot a + b - c",
    "y=-{x}^2+2",
    // function test
    "f(x) = 5x",
    "f(10)",
    "f(x)",
    "f(1)",
    /// hot test
    "g=2x",
    "h=g+1",
    "y=4",
    // v fields
    "y'=x^2",
  ]; // todo handle unknown symbol errors
  inputData = inputData ?? exampleInputData;

  const asciiMath = inputData.map((input) => latexToAscii(input));

  log(asciiMath);

  const trees = asciiMath.map((ascii) => math.parse(ascii));
  const formulaeIndices: number[] = [];

  // ------------------------------------------
  // Initial Processing
  // ------------------------------------------

  // dependency map only stores assignments and their dependencies
  const depMap: Map<string, Dependencies> = new Map();
  const visType: VisualType[] = new Array(trees.length);
  const depVar: (HotVar | undefined)[] = new Array(trees.length);

  for (let i = 0; i < trees.length; i++) {
    const root = trees[i];
    let nodeDeps: string[] = [];
    log(root);

    // some deps need to be ignored because f(x)=ax does not depend on x
    let ignoreDeps: string[] = [];
    // assignment nodes shouldn't consider themselves as dependencies
    let traversalHead = root;
    // the variable being assigned stored for dependency resolution
    let assignId: string = "";

    if (root.type === "FunctionAssignmentNode") {
      const nodeFn = root as math.FunctionAssignmentNode;
      ignoreDeps = nodeFn.params;
      traversalHead = nodeFn.expr;
      assignId = nodeFn.name;
      visType[i] = "novisual";
    } else if (root.type === "AssignmentNode") {
      const nodeAssign = root as math.AssignmentNode;
      const name = nodeAssign.name;
      traversalHead = nodeAssign.value;

      let dependentVar: HotVar | undefined;
      if (["x", "y", "t"].includes(name)) {
        dependentVar = assignId as HotVar;
        visType[i] = "curve";
        depVar[i] = dependentVar;
        formulaeIndices.push(i);
      } else if (name === "y'") {
        visType[i] = "field";
        depVar[i] = "y";
        formulaeIndices.push(i);
      } else {
        visType[i] = "value";
        assignId = name;
      }
    } else {
      visType[i] = "value";
      formulaeIndices.push(i);
    }

    traversalHead.traverse((node) => {
      if (node.type !== "SymbolNode") return;
      const name = (node as math.SymbolNode).name;
      if (ignoreDeps.length != 0 && ignoreDeps.includes(name)) return;
      nodeDeps.push(name);
    });

    if (assignId) depMap.set(assignId, { dependencies: nodeDeps, expId: i });
    else depMap.set(i.toString(), { dependencies: nodeDeps, expId: i });
  }

  log("Dependencies:", depMap);

  // ------------------------------------------
  // Dependency Analysis
  // ------------------------------------------
  //     - Scanning for cycles
  //     - Topological sorting

  // for vector fields, only explicit expressions in terms of y' are considered
  for (const [_, v] of depMap) {
    const id = v.expId;
    const deps = v.dependencies;

    for (const dep of deps) {
      if (dep === "y'") {
        throw new UnsupportedFeatureError(
          id,
          "Only explicit differential equations equations are supported. Try putting y' on the left hand side.",
        );
      }
    }
  }

  const priority = dependencyAnalysis(depMap);
  log("Dependency Priority:", priority);

  // an object is hot if it, or its dependencies, depend on x,y, or t.
  // todo temporarily making vfields always hot

  const hotMap: boolean[] = new Array(trees.length).fill(false);
  for (const root of priority) {
    const rootDep = depMap.get(root)!;
    const i = rootDep.expId;
    const childs = rootDep.dependencies;

    if (visType[i] === "field") {
      hotMap[i] = true;
      break;
    }

    for (const child of childs) {
      if (["x", "y", "t"].includes(child)) {
        hotMap[i] = true;
        break;
      }

      const childDep = depMap.get(child)!;
      const childId = childDep.expId;

      if (hotMap[childId]) {
        hotMap[i] = true;
        break;
      }
    }
  }

  for (const i of formulaeIndices) {
    const deps = depMap.get(i.toString())!.dependencies;

    let hot = deps.some((dep) => ["x", "y", "t"].includes(dep));
    if (hot) break;

    for (const dep of deps) {
      const depId = depMap.get(dep)!.expId;
      if (hotMap[depId]) {
        hot = true;
        break;
      }
    }
  }

  log("Hot Map:", hotMap);

  // ------------------------------------------
  // Metadata
  // ------------------------------------------

  const metadata: Metadata[] = new Array(trees.length);
  for (let i = 0; i < trees.length; i++) {
    // hot value types should be interpreted as curves
    if (hotMap[i] && visType[i] === "value") {
      visType[i] = "curve";
      depVar[i] = "y";
      // todo hot values in terms of y will be problematic
    }

    metadata[i] = {
      type: visType[i],
      hot: hotMap[i],
      dependentVar: depVar[i],
    };
  }

  // ------------------------------------------
  // Compilation
  // ------------------------------------------

  // compile all expressions
  const compiled = trees.map((tree) => tree.compile());

  const priorityIndices = priority.map((label) => depMap.get(label)!.expId);
  priorityIndices.push(...formulaeIndices); // formulae are lowest priority

  // the cold scope is the basic state that doesn't depend on unstable values
  const coldScope = {};
  // second number is to store the IVP curve assoc. with vfield
  const state: Array<number | [number | undefined, number | undefined]> =
    new Array(trees.length);

  for (const i of priorityIndices) {
    if (hotMap[i]) continue;
    if (!compiled[i]) continue;
    const result = compiled[i].evaluate(coldScope);
    state[i] = result;
  }

  let vFields = metadata
    .map((m, i) => (m.type === "field" ? i : -1))
    .filter((i) => i != -1);
  let odeSolvers: Map<number, (scope: any) => number> = new Map();

  return {
    metadata,
    state, // overwritten with hot values after eval

    odeInitialConditions(y0: number, t0: number) {
      odeSolvers.clear();

      for (const i of vFields) {
        const fn = compiled[i];

        let scopeLock: [any] = [{}];
        const ode = (_: number, _2: number[]): number[] => {
          const scope = scopeLock[0];
          return [fn.evaluate(scope)];
        };

        // todo impl systems of equations
        const solver = new Solver(ode, 1);
        const model = solver.integrate(t0, [y0]);

        const f = (scope: any) => {
          scopeLock[0] = scope;
          return model(scope.t)[0];
        };

        odeSolvers.set(i, f);
      }
    },

    evalWith(indepVar: number, depVar: number, vectorFields = false) {
      const controlledState = { x: indepVar, y: depVar, t: indepVar };

      let scope = { ...coldScope, ...controlledState };

      for (const i of priorityIndices) {
        if (!hotMap[i]) continue;

        if (metadata[i].type !== "field") {
          const fn = compiled[i];
          const result = fn.evaluate(scope);
          state[i] = result;
        } else {
          // vector field eval two parts:
          //     - IVP curve
          //     - vector field

          // vector fields require making calls to a 3rd party ODE solver
          let slopeResult: number | undefined;
          let ivpResult: number | undefined;

          const fn = odeSolvers.get(i);
          if (fn) {
            ivpResult = fn(scope);
          }

          if (vectorFields) {
            // vector field, not IVP curve
            const fn = compiled[i];
            const result = fn.evaluate(scope);
            slopeResult = result;
          }

          state[i] = [slopeResult, ivpResult];
        }

        const meta = metadata[i];
        if (meta.type === "curve" || meta.type === "field") {
          // x,y,t need to be reinitialized after each curve/field due to impurities in
          // the way the scope is managed
          scope = { ...scope, ...controlledState };
        }
      }

      return this;
    },
  };
}

// returns a prioritized list of of the inputs based on their valid evaluation order
function dependencyAnalysis(depMap: Map<string, Dependencies>): string[] {
  // using arrays in place of sets because the
  // amount of elements should be very small
  const cache = new Map<string, number>();
  const search = (node: string, seen: string[] = []): number => {
    // recursive function:
    //    return the degree of the current node;
    //    degree is 1 + the maximum degree of its children.
    //
    //    if a child is included in seen, it is involved in a cycle,
    //    cycles result in raising an error.

    if (cache.has(node)) return cache.get(node)!;

    const childs = depMap.get(node)?.dependencies ?? [];

    if (childs.length == 0) {
      cache.set(node, 0);
      return 0;
    }

    // x, y, t are programatically controlled
    // and should be declared as implied assignments
    if (["x", "y", "t"].includes(node)) {
      cache.set(node, 0);
      return 0;
    }

    const result =
      1 +
      Math.max(
        ...childs.map((child) => {
          if (seen.includes(child)) {
            throw new CircularDependencyError(
              [node, child].map((node) => depMap.get(node)!.expId),
              [node, child],
            );
          }
          return search(child, [...seen, node]);
        }),
      );

    cache.set(node, result);
    return result;
  };

  return Array.from(depMap.keys()).sort((a, b) => search(a) - search(b));
}

let uni = buildUniverse([]);
log("State:", JSON.stringify(uni.state, null, 2));

log("Eval with", 3, 2);
uni.evalWith(3, 2);
log("State:", JSON.stringify(uni.state, null, 2));

log("Eval with", 1, 1);
uni.evalWith(1, 1);
log("State:", JSON.stringify(uni.state, null, 2));

log("Universe:", uni);

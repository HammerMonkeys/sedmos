import * as math from "mathjs";
import latexToAscii from "./utils/latexToAscii";
import log from "./log";

// All dependencies are parsed as "symbols"
interface Dependencies {
  dependencies: string[];
  expId: number;
}

interface Universe {
  globalScope: Map<string, any>;
  setIndepVar(value: number): void;
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

function handle() {
  // TODO remove
  log("\n\n\n\n");

  const inputData = [
    "a=2",
    "b=12",
    "c=18",
    "",
    "d = 2\\cdot a + b - c",
    "f(x) = 5x",
    "f(10)",
    "f(x)",
    "f(1)",
  ];

  const asciiMath = inputData.map((input) => latexToAscii(input));
  const trees = asciiMath.map((ascii) => math.parse(ascii));

  //---------------------     Dependency Resolution

  // dependency map only stores assignments and their dependencies
  let depMap: Map<string, Dependencies> = new Map();

  for (let i = 0; i < trees.length; i++) {
    const root = trees[i];
    let nodeDeps: string[] = [];

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
    } else if (root.type === "AssignmentNode") {
      const nodeAssign = root as math.AssignmentNode;
      traversalHead = nodeAssign.value;
      assignId = nodeAssign.name;
    }

    traversalHead.traverse((node) => {
      if (node.type !== "SymbolNode") return;
      const name = (node as math.SymbolNode).name;
      if (ignoreDeps.length != 0 && ignoreDeps.includes(name)) return;
      nodeDeps.push(name);
    });

    if (assignId) depMap.set(assignId, { dependencies: nodeDeps, expId: i });
  }

  log("Dependencies:", depMap);

  // ---------------------     Dependency Analysis
  //     - Scanning for cycles
  //     - Topological sorting
  // ---------------------

  const priority = dependencyAnalysis(depMap);
  log("Dependency Priority:", priority);

  // ---------------------     Compilation

  // expressions -> compiled functions

  // the scope is mutated during eval, some variables
  // like x are partially controlled programatically
  let scopeGlobal = { x: 0 };
  const compiled = trees.map((tree) => tree.compile());
  const callable = compiled.map((fn) => (scope: any) => {
    if (scope) scopeGlobal = { ...scopeGlobal, ...scope };
    return fn.evaluate(scopeGlobal);
  });

  // for (const call of callable) {
  //   log(call({ x: 2 }));
  // }
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

handle();

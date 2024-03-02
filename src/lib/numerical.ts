import * as math from "mathjs";
import latexToAscii from "./utils/latexToAscii";

// All dependencies are parsed as "symbols"
type Dependency = string;

function handle() {
  // TODO remove
  console.log("\n\n\n\n");

  const inputData = [
    "a=2",
    "b=12",
    "c=18",
    "",
    "2\\cdot a + b - c",
    "f(x) = 5x",
    "f(10)",
  ];

  const asciiMath = inputData.map((input) => latexToAscii(input));
  const trees = asciiMath.map((ascii) => math.parse(ascii));

  // expressions -> dependencies

  let deps: Dependency[][] = [];

  for (const root of trees) {
    let nodeDeps: Dependency[] = [];

    // some deps need to be ignored because f(x)=ax does not depend on x
    let ignoreDeps: string[] = [];
    if (root.type === "FunctionAssignmentNode") {
      const nodeFn = root as math.FunctionAssignmentNode;
      ignoreDeps = nodeFn.params;
    }

    root.traverse((node) => {
      if (node.type !== "SymbolNode") return;
      const name = (node as math.SymbolNode).name;
      if (ignoreDeps.length != 0 && ignoreDeps.includes(name)) return;
      nodeDeps.push(name);
    });

    deps.push(nodeDeps);
  }

  const scope = {}; // scope is updated during eval
  const exp = trees.map((tree) => tree.compile());
  const results = exp.map((compiled) => compiled.evaluate(scope));

  console.log(results);
  console.log(scope);
}

handle();

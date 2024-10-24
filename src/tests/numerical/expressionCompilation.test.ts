import * as math from "mathjs";
import latexToAscii from "$lib/utils/latexToAscii";
import {Expression} from "$lib/numerical/evalGraph";

describe("Latex -> Ascii", () => {
  test("Quadratic Formula", () => {
    const latex = "\\frac{-b+\\sqrt{b^{2}-4ac}}{2a}";
    const ascii = "(-b+sqrt(b^2-4*a*c))/(2*a)";
    expect(latexToAscii(latex)).toBe(ascii);
  });

  // TODO: Latex -> Ascii conversion can't do long function names
  // test("Complex function names", () => {
  //   const latex = "FiG'(a,b) = 1";
  //   expect(latexToAscii(latex)).toBe(latex);
  // });
});

test("MathJS simple evaluation", () => {
  const expr = "y = x^2 + 2*x + 1";
  const comp = math.compile(expr);
  const scope = {x: 0};
  expect(comp.evaluate(scope)).toBe(1);
  expect(scope).toEqual({x: 0, y: 1});
  scope.x = 1;
  expect(comp.evaluate(scope)).toBe(4);
});

describe("Expression for EvalGraph", () => {
  test("Simple eval", () => {
    const expr = new Expression("f(a,b) = a^2 + 2*x + c");
    const scope = new Map<string, number>([["x", 1], ["c", 2], ["a", 10]]);
    const fn = expr.eval(scope)
    expect(fn).toBeInstanceOf(Function);
    expect(fn(1, 0)).toBe(5);
  });

  test("Proper meta information", () => {
    const expr = new Expression("Q(a,b) = a^2 + 2*x + c");
    expect(expr.args).toEqual(new Set(["a", "b"]));
    expect(expr.deps).toEqual(new Set(["x", "c"]));
    expect(expr.id).toBe("Q");
  });
});
import {EvalGraph} from "$lib/numerical/evalGraph";
import {exp} from "mathjs";
import {Expression} from "$lib/numerical/expression";

test("Simple eval", () => {
  const exps = [
    "y = x^2",
    "x = 5y"
  ].map((expr, i) => new Expression(expr, i.toString()));

  const evalGraph = new EvalGraph();
  exps.forEach((exp) => evalGraph.learn(exp));

  expect(evalGraph.get("y")).toBe(undefined);
  expect(evalGraph.get("x")).toBe(undefined);

  evalGraph.specify("x", 2);
  expect(evalGraph.get("0")).toBe(4);
  expect(evalGraph.get("1")).toBe(undefined);

  evalGraph.specify("y", 3);
  expect(evalGraph.get("0")).toBe(4);
  expect(evalGraph.get("1")).toBe(15);
});

test("Dependency evaluation", () => {
  const exps = [
    "f(1)",
    "f(a) = 3a",
    "d = b + c",
    "c = 2 + a",
    "b = 3 + a",
    "a = 2"
  ].map((expr) => new Expression(expr));
  exps[0].id = "f(1)";

  const evalGraph = new EvalGraph();
  exps.forEach((exp) => evalGraph.learn(exp));

  expect(evalGraph.get("a")).toBe(2);
  expect(evalGraph.get("d")).toBe(9);
  expect(evalGraph.get("f(1)")).toBe(3);
})

test("Update", () => {
  const exps = [
    "f(1)",
    "f(a) = 3a",
    "d = b + c",
    "c = 2 + a",
    "b = 3 + a",
    "a = 2"
  ].map((expr) => new Expression(expr));
  exps[0].id = "f(1)";

  const evalGraph = new EvalGraph();
  exps.forEach((exp) => evalGraph.learn(exp));

  const inject = new Expression("f(d) = 10d + a");
  evalGraph.learn(inject);
  expect(evalGraph.get("f(1)")).toBe(12);

  evalGraph.specify("a", 0);
  expect(evalGraph.get("d")).toBe(5);
})

test("Forget", () => {
  const exps = [
    "a=1",
    "b=a",
    "c=b",
    "d=c",
  ].map((expr) => new Expression(expr));

  const evalGraph = new EvalGraph();
  exps.forEach((exp) => evalGraph.learn(exp));

  expect(evalGraph.get("d")).toBe(1);

  evalGraph.forget("a");
  expect(evalGraph.get("d")).toBe(undefined);
});

test("Cycle detection", () => {
  const exps = [
    "a=1",
    "b=a",
    "c=b",
    "d=c"
  ].map((expr) => new Expression(expr));

  const evalGraph = new EvalGraph();
  exps.forEach((exp) => evalGraph.learn(exp));

  expect(() => evalGraph.learn(new Expression("a=d"))).toThrow();
});

test("Update heat", () => {
  const exps = [
    "a=x",
    "b=a",
    "c=b",
    "d=c"
  ].map((expr) => new Expression(expr));

  const evalGraph = new EvalGraph();
  exps.forEach((exp) => evalGraph.learn(exp));

  let hot = evalGraph.specify("x", 3);
  for (const id of ["a", "b", "c", "d"]) {
    expect(hot).toContain(id);
  }

  hot = evalGraph.forget("b");
  for (const id of ["b", "c", "d"]) {
    expect(hot).toContain(id);
  }
});
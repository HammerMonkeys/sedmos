import {BatchEvaluator} from "$lib/numerical/batchEvaluator";
import {exp} from "mathjs";

describe("Chunk evaluation", () => {
  test("Simple curves", () => {
    function y_xx(x: number) {
      return x * x;
    }

    function x_5y(y: number) {
      return 5 * y;
    }

    const chunkSize = 10;
    const steps = 10;
    const batchEval = new BatchEvaluator(false, chunkSize, steps);

    batchEval.add("y = x^2");
    batchEval.add("x = 5y");

    let region = batchEval.getChunk([0,0]);
    expect(region.length).toBe(2);

    let eq0 = region[0];
    let eq1 = region[1];

    expect(eq0.length).toBe(chunkSize);
    expect(eq1.length).toBe(chunkSize);

    for (let x = 0; x < chunkSize; x++) {
      expect(eq0[x][0]).toBe(x);
      expect(eq0[x][1]).toBe(y_xx(x));
    }

    for (let y = 0; y < chunkSize; y++) {
      expect(eq1[y][0]).toBe(x_5y(y));
      expect(eq1[y][1]).toBe(y);
    }
  });

  test("Simple field", () => {
    function f(x: number, y: number) {
      return x * 3*y;
    }

    const chunkSize = 10;
    const steps = 10;
    const batchEval = new BatchEvaluator(false, chunkSize, 0, steps);

    batchEval.add("y' = x * 3y");

    let region = batchEval.getChunk([0,0]);
    expect(region.length).toBe(1);

    let eq0 = region[0];
    expect(eq0.length).toBe(steps ** 2);

    const expected = new Set();
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        const z = f(x, y);
        expected.add([x, y, z]);
      }
    }

    expect(eq0.length).toBe(expected.size);

    for (const item of expected) {
      expect(eq0).toContainEqual(item);
    }
  });
});
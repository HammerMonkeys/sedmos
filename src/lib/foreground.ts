import baseLog from "$lib/log";
import { buildUniverse } from "$lib/numerical";
import type { Universe } from "$lib/numerical";

const log = (...args: any[]) => baseLog("\t-", ...args);
// todo remove
log("\n\n\n\n\n");

const macroDivisions = 6;
const microDivisions = 120;
const chunkWidth = 5;
const microStep = chunkWidth / microDivisions;
const macroStep = chunkWidth / macroDivisions;
const vectorArrowSize = 10;

let previousUniverse: Universe | undefined;
export function buildRenderer(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  latexInput: string[],
): (chunkOrigin: [number, number]) => void {
  // clone
  latexInput = [...latexInput];

  let universe: Universe;
  try {
    universe = buildUniverse(latexInput);
    previousUniverse = universe;
  } catch (err) {
    if (err instanceof SyntaxError || err instanceof TypeError) {
      if (!previousUniverse)
        throw new Error("Parsing issue. Unable to define the universe.");

      universe = previousUniverse!;
    } else {
      throw err;
    }
  }

  /**
   * What a universe looks like, state:
   *   list of:
   *
   *      - numbers
   *      - [number?, number?] // for v fields
   *
   *  corresponding metadata like:
   *      type, dep var
   *
   *  also, must call withEval(...)
   */

  type ChunkState = {
    rowState: number[][];
    gridState: number[][][];
  };

  const chunks: Map<string, ChunkState> = new Map();

  const w2sConv = (x: number, y: number): [number, number] => {
    const s = (1 / 100) * 2;
    return [x / s + 130, y / s + 240];
  };

  const metadata = universe.metadata;
  const fieldIndices = metadata
    .map((m, i) => (m.type === "field" ? i : -1))
    .filter((i) => i != -1);
  const curveIndices = metadata
    .map((m, i) => (m.type === "curve" ? i : -1))
    .filter((i) => i != -1);

  const x0 = -2;
  let microAxis: number[] = [];
  for (let i = x0; i < x0 + chunkWidth; i += microStep) {
    microAxis.push(i);
  }

  let macroAxis: number[] = [];
  for (let i = x0; i < x0 + chunkWidth; i += macroStep) {
    macroAxis.push(i);
  }

  const setChunk = (p: [number, number], state: ChunkState) => {
    chunks.set(p.toString(), state);
  };

  const buildChunk = (chunkOrigin: [number, number]) => {
    const x0 = chunkOrigin[0] * chunkWidth;
    const y0 = chunkOrigin[1] * chunkWidth;

    // curves
    // todo vector field ivp

    const rowState = new Array(microDivisions);

    for (const i in microAxis) {
      const offset = microAxis[i];
      const state = new Array(curveIndices.length);
      const x = x0 + offset;
      universe.evalWith(x, 0);

      for (const curveId in curveIndices) {
        const uniId = curveIndices[curveId];
        const out = universe.state[uniId];
        state[curveId] = out;
      }

      rowState[i] = state;
    }

    // fields

    const gridState = new Array(macroDivisions)
      .fill(0)
      .map(() => new Array(macroDivisions).fill(0));

    for (const i in macroAxis) {
      const x = x0 + macroAxis[i];
      for (const j in macroAxis) {
        const y = y0 + macroAxis[j];

        // enable vector fields
        universe.evalWith(x, y, true);
        const state = new Array(fieldIndices.length);

        for (const fieldId in fieldIndices) {
          const uniId = fieldIndices[fieldId];
          const out = universe.state[uniId] as [
            number | undefined,
            number | undefined,
          ];
          const [field, ivp] = out;
          state[fieldId] = field;
          gridState[i][j] = state;
        }
      }
    }

    const chunkState = { rowState, gridState };
    setChunk(chunkOrigin, chunkState);
    return chunkState;
  };

  const getOrBuildChunk = (p: [number, number]) => {
    let chunk = chunks.get(p.toString());
    if (!chunk) chunk = buildChunk(p);
    return chunk;
  };

  const renderChunk = (chunkOrigin: [number, number]) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";
    const chunk = getOrBuildChunk(chunkOrigin);

    // handling row state

    const rowState = chunk.rowState;
    const x0 = chunkOrigin[0] * chunkWidth;

    for (const curveId in curveIndices) {
      // todo x dep var
      const y0 = rowState[0][curveId];
      if (y0 === undefined) continue;

      ctx.beginPath();
      ctx.moveTo(...w2sConv(x0, y0));

      for (const i in microAxis) {
        const offset = microAxis[i];
        let x = x0 + offset;
        const y = rowState[i][curveId];
        ctx.lineTo(...w2sConv(x, y));
      }

      ctx.stroke();
    }

    // handling grid state (vector fields)

    const gridState = chunk.gridState;
    const y0 = chunkOrigin[1] * chunkWidth;

    for (const fieldId in fieldIndices) {
      // todo set field color here
      ctx.strokeStyle = "sky_blue";

      for (const i in macroAxis) {
        const x = x0 + macroAxis[i];
        for (const j in macroAxis) {
          const y = y0 + macroAxis[j];
          const state = gridState[i][j];

          const slope = state[fieldId];
          if (slope === undefined) continue;

          ctx.beginPath();

          const angle = Math.atan(slope);
          const [sx, sy] = w2sConv(x, y);

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(angle);

          ctx.moveTo(0, 0);
          ctx.lineTo(vectorArrowSize, 0);
          ctx.lineTo(vectorArrowSize * 0.67, vectorArrowSize * 0.4);
          ctx.moveTo(vectorArrowSize, 0);
          ctx.lineTo(vectorArrowSize * 0.67, -vectorArrowSize * 0.4);

          ctx.stroke();
          ctx.restore();
        }
      }
    }
  };

  return renderChunk;
}

export default buildRenderer;

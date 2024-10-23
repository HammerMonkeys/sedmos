import type { Universe } from "$lib/numerical";
import type { int } from "$lib/types";
import type { CanvasBrain } from "$lib/canvas/canvasBrain";

interface ChunkState {
  rowState: number[][];
  gridState: number[][][];
}

// imagine walking a grid in a zig-zag pattern
// 0 2 5 9 ...
// 1 4 8
// 3 7
// 6
// (Roughly)
// Thus, we map R2 to R. Negative numbers are handled
// by mapping positives to evens, and negatives to odds.
// Non-integers are not handled and should not be used.
function cantorPairing(x: int, y: int): int {
  x = x < 0 ? -2 * x - 1 : 2 * x;
  y = y < 0 ? -2 * y - 1 : 2 * y;
  return ((x + y) * (x + y + 1)) / 2 + y;
}

export class ChunkManager {
  public readonly chunkSize: number;
  public readonly universe: Universe;
  public readonly microSplits: int;
  public readonly macroSplits: int;

  private readonly chunks: Map<int, ChunkState> = new Map();

  // The universe should not be modified after construction.
  // The system will not rebuild stale chunks generated before
  // a modified universe. Instead, the manager should be
  // reinitialized.
  constructor(
    universe: Universe,
    chunkSize: number,
    microSplits: int = 15,
    macroSplits: int = 5,
  ) {
    this.chunkSize = chunkSize;
    this.universe = universe;
    this.microSplits = microSplits;
    this.macroSplits = macroSplits;
    this.microGap = this.chunkSize / this.microSplits;
    this.macroGap = this.chunkSize / this.macroSplits;
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  public readonly chunkCoord = {
    fromWorld: (x: number, y: number): [int, int] => {
      return [Math.floor(x / this.chunkSize), Math.floor(y / this.chunkSize)];
    },

    toWorld: (x: number, y: number): [number, number] => {
      return [x * this.chunkSize, y * this.chunkSize];
    },
  };

  private getChunk(x: int, y: int) {
    const id = cantorPairing(x, y);
    return this.chunks.get(id);
  }

  private setChunk(x: int, y: int, chunk: ChunkState) {
    const id = cantorPairing(x, y);
    this.chunks.set(id, chunk);
  }

  // --------------------------------------------------
  // Computational
  // --------------------------------------------------

  private readonly microGap: number;
  private readonly macroGap: number;

  // TODO: to proceed, the Universe should be modified to provide the state
  // of an entire region instead of a particular coordinate to open the door
  // to GPU parallelization later. It should be:
  //   computeRegion(coords, curveSubdivisions, fieldSubdivisions) => Drawable[]
  //   Drawable: Curve | VField
  //     Curve: Coord[]  // + NaN seperators (for intermediate holes)
  //     VField: (Coord,Value)[][]
  // with these changes, buildChunk may not be necessary. In that case, Universe
  // should automaticaly cache the region values.
}

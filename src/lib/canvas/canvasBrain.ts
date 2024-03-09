import log from "$lib/log";

export class Bounds {
  public originX: number;
  public originY: number;
  public width: number;
  public height: number;

  constructor(width = 0, height = 0, originX = 0, originY = 0) {
    this.originX = originX;
    this.originY = originY;
    this.width = width;
    this.height = height;
  }
}

export interface CanvasBrain extends CanvasRenderingContext2D {
  canvasBounds: Bounds;
  worldBounds: Bounds;
  scaleFactors: {
    domToCanvas: number;
    screenToWorld: number;
    canvasToWorld: number;
    domToWorld: number;
  };
  conv: {
    screenToCanvas(x: number, y: number): [number, number];
    canvasToScreen(x: number, y: number): [number, number];
    canvasToWorld(x: number, y: number): [number, number];
    worldToCanvas(x: number, y: number): [number, number];
    domToWorld(x: number, y: number): [number, number];
  };
}

export function newCanvasBrain(
  canvas: HTMLCanvasElement,
  domBounds: Bounds,
  screenToWorld = 50,
  domToCanvas = 1.2,
): CanvasBrain {
  // public members

  const worldBounds = new Bounds();
  const canvasBounds = new Bounds();
  const aspectRatio = domBounds.width / domBounds.height;

  const scaleFactors = {
    domToCanvas,
    screenToWorld,
    // init values
    canvasToWorld: 0,
    domToWorld: 0,
  };

  // private members
  const ctx = canvas.getContext("2d")!;
  if (!ctx) throw new Error("No 2d context available on canvas.");

  // initialization
  {
    canvasBounds.width = domBounds.width * scaleFactors.domToCanvas;
    canvasBounds.height = domBounds.height * scaleFactors.domToCanvas;
    canvas.width = canvasBounds.width;
    canvas.height = canvasBounds.height;

    worldBounds.width = scaleFactors.screenToWorld;
    worldBounds.height = scaleFactors.screenToWorld / aspectRatio;

    scaleFactors.canvasToWorld =
      scaleFactors.screenToWorld / canvasBounds.width;
    scaleFactors.domToWorld =
      scaleFactors.domToCanvas * scaleFactors.canvasToWorld;
  }

  const conv = {
    // screen coordinates are (square) relative canvas coordinates.
    screenToCanvas(x: number, y: number): [number, number] {
      return [x * canvasBounds.width, y * canvasBounds.height];
    },

    canvasToScreen(x: number, y: number): [number, number] {
      return [x / canvasBounds.width, y / canvasBounds.height];
    },

    canvasToWorld(x: number, y: number): [number, number] {
      return [
        worldBounds.originX + x * scaleFactors.canvasToWorld,
        worldBounds.originY +
          (canvasBounds.height - y) * scaleFactors.canvasToWorld,
      ];
    },

    worldToCanvas(x: number, y: number): [number, number] {
      return [
        (x - worldBounds.originX) / scaleFactors.canvasToWorld,
        (worldBounds.height - y + worldBounds.originY) /
          scaleFactors.canvasToWorld,
      ];
    },

    domToWorld(x: number, y: number): [number, number] {
      const X = x * scaleFactors.domToCanvas;
      const Y = y * scaleFactors.domToCanvas;
      return conv.canvasToWorld(X, Y);
    },
  };

  return Object.assign(ctx, {
    canvasBounds,
    worldBounds,
    scaleFactors,
    conv,
  });
}

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

export class CanvasBrain {
  public readonly domBounds: Bounds;
  public readonly worldBounds = new Bounds();
  public readonly canvasBounds = new Bounds();
  public readonly aspectRatio: number;

  public readonly scale = {
    // init values
    domToCanvas: 0,
    screenToWorld: 0,
    canvasToWorld: 0,
    domToWorld: 0,
  };

  private ctx: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    domBounds: Bounds,
    screenToWorld = 50,
    domToCanvas = 1.2,
  ) {
    this.domBounds = domBounds;
    this.scale.screenToWorld = screenToWorld;
    this.scale.domToCanvas = domToCanvas;

    this.ctx = canvas.getContext("2d")!;
    if (!this.ctx) throw new Error("No 2d context available on canvas.");

    this.aspectRatio = this.domBounds.width / this.domBounds.height;

    this.canvasBounds.width = this.domBounds.width * this.scale.domToCanvas;
    this.canvasBounds.height = this.domBounds.height * this.scale.domToCanvas;
    canvas.width = this.canvasBounds.width;
    canvas.height = this.canvasBounds.height;

    this.worldBounds.width = this.scale.screenToWorld;
    this.worldBounds.height = this.scale.screenToWorld / this.aspectRatio;

    this.scale.canvasToWorld =
      this.scale.screenToWorld / this.canvasBounds.width;
    this.scale.domToWorld = this.scale.domToCanvas * this.scale.canvasToWorld;
  }

  public readonly conv = (() => {
    const { canvasBounds, worldBounds, scale } = this;

    function canvasToWorld(x: number, y: number) {
      return [
        worldBounds.originX + x * scale.canvasToWorld,
        worldBounds.originY + (canvasBounds.height - y) * scale.canvasToWorld,
      ];
    }

    return {
      // screen coordinates are (square) relative canvas coordinates.
      screenToCanvas(x: number, y: number) {
        return [x * canvasBounds.width, y * canvasBounds.height];
      },

      canvasToScreen(x: number, y: number) {
        return [x / canvasBounds.width, y / canvasBounds.height];
      },

      canvasToWorld,

      worldToCanvas(x: number, y: number) {
        return [
          (x - worldBounds.originX) / scale.canvasToWorld,
          (worldBounds.height - y + worldBounds.originY) / scale.canvasToWorld,
        ];
      },

      domToWorld(x: number, y: number) {
        const X = x * scale.domToCanvas;
        const Y = y * scale.domToCanvas;
        return canvasToWorld(X, Y);
      },
    };
  })();

  public readonly draw = (() => {
    const { canvasBounds, conv, ctx, worldBounds } = this;

    const keystones = [] as [number, number][];

    const point = (x: number, y: number, c: number, msg: string) => {
      // map c to hue
      const color = `hsl(${c * 360}, 100%, 85%)`;
      ctx.strokeStyle = color;

      ctx.beginPath();
      const rad = 20;
      ctx.lineWidth = 10;
      ctx.arc(x, y, rad, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.font = "30px serif";
      const xOff = (x - canvasBounds.width / 2) / 4 + 80;
      const yOff = (y - canvasBounds.height / 2) / 15;
      ctx.fillText(msg, x - xOff, y - yOff);
    };

    const screenPoint = (x: number, y: number, c = 1, msg = "") => {
      this.draw.point(
        X,
        Y,
        c,
        `s(${Math.round(x * 10) / 10}, ${Math.round(y * 10) / 10}) ${msg}`,
      );
    };

    const worldPoint = (x: number, y: number, c = 1, msg = "") => {
      const [X, Y] = conv.worldToCanvas(x, y);
      point(X, Y, c, `w(${Math.round(x)}, ${Math.round(y)}) ${msg}`);
    };

    const scene = () => {
      ctx.reset();
      const { screenPoint, worldPoint } = this.draw;

      for (let i = 0.2; i <= 0.8; i += 0.1) {
        const x = i;
        screenPoint(x, x, (i - 0.2) / 0.8, Math.round(i * 10).toString());
      }

      worldPoint(worldBounds.originX, worldBounds.originY, 0, "origin");
      const edgeX = worldBounds.originX + worldBounds.width;
      const edgeY = worldBounds.originY + worldBounds.height;
      worldPoint(edgeX, edgeY, 0, "edge");

      for (const k of keystones) {
        const [x, y] = k;
        worldPoint(x, y, Math.random());
      }

      // drawing origin axis

      {
        worldPoint(0, 0, 0);
        const [x0, y0] = conv.worldToCanvas(0, 0);
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0, canvasBounds.height);
        ctx.moveTo(0, y0);
        ctx.lineTo(canvasBounds.width, y0);
        ctx.stroke();
      }
    };

    return {
      point,
      screenPoint,
      worldPoint,
      scene,
      keystones,
    };
  })();
}

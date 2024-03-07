<script lang="ts">
  import "../../app.css";
  import log from "$lib/log";

  let canvas: HTMLCanvasElement;

  class Bounds {
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

  // specified reactivity
  let domBounds = new Bounds();
  let canvasBounds = new Bounds();
  let worldBounds = new Bounds();
  $: aspectRatio = domBounds.width / domBounds.height;

  const scale = {
    domToCanvas: 1.2,
    screenToWorld: 50,

    // init values
    canvasToWorld: 0,
    domToWorld: 0,
  };

  function init() {
    canvasBounds.width = domBounds.width * scale.domToCanvas;
    canvasBounds.height = domBounds.height * scale.domToCanvas;

    worldBounds.width = scale.screenToWorld;
    worldBounds.height = scale.screenToWorld / aspectRatio;

    scale.canvasToWorld = scale.screenToWorld / canvasBounds.width;
    scale.domToWorld = scale.domToCanvas * scale.canvasToWorld;
  }

  $: if (canvas) init();

  const conv = {
    // screen coordinates are (square) relative canvas coordinates.
    screenToCanvas(x: number, y: number) {
      return [x * canvasBounds.width, y * canvasBounds.height];
    },

    canvasToScreen(x: number, y: number) {
      return [x / canvasBounds.width, y / canvasBounds.height];
    },

    canvasToWorld(x: number, y: number) {
      return [
        worldBounds.originX + x * scale.canvasToWorld,
        worldBounds.originY + (canvasBounds.height - y) * scale.canvasToWorld,
      ];
    },

    worldToCanvas(x: number, y: number) {
      return [
        (x - worldBounds.originX) / scale.canvasToWorld,
        (worldBounds.height - y + worldBounds.originY) / scale.canvasToWorld,
      ];
    },

    domToWorld(x: number, y: number) {
      const X = x * scale.domToCanvas;
      const Y = y * scale.domToCanvas;
      return conv.canvasToWorld(X, Y);
    },
  };

  let ctx: CanvasRenderingContext2D;

  const draw = {
    point(x: number, y: number, c: number, msg: string) {
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
    },

    screenPoint(x: number, y: number, c = 1, msg = "") {
      const [X, Y] = conv.screenToCanvas(x, y);
      draw.point(
        X,
        Y,
        c,
        `s(${Math.round(x * 10) / 10}, ${Math.round(y * 10) / 10}) ${msg}`,
      );
    },

    worldPoint(x: number, y: number, c = 1, msg = "") {
      const [X, Y] = conv.worldToCanvas(x, y);
      draw.point(X, Y, c, `w(${Math.round(x)}, ${Math.round(y)}) ${msg}`);
    },

    keystones: [] as [number, number][],

    scene() {
      if (!ctx) ctx = canvas.getContext("2d")!;
      ctx.reset();
      const { screenPoint, worldPoint } = draw;

      for (let i = 0.2; i <= 0.8; i += 0.1) {
        const x = i;
        screenPoint(x, x, (i - 0.2) / 0.8, Math.round(i * 10).toString());
      }

      worldPoint(worldBounds.originX, worldBounds.originY, 0, "origin");
      const edgeX = worldBounds.originX + worldBounds.width;
      const edgeY = worldBounds.originY + worldBounds.height;
      worldPoint(edgeX, edgeY, 0, "edge");

      for (const k of draw.keystones) {
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
    },
  };

  function onResize() {
    canvas.width = canvasBounds.width;
    canvas.height = canvasBounds.height;
    draw.scene();
  }
  $: if (canvas) onResize();

  const mouse = (() => {
    // impure values are stored in a closure
    let xPrev: number | null = null;
    let yPrev: number | null = null;
    let downSince = 0;
    const scrollSpeed = 1.1;
    const clickTolerance = 100; // ms

    return {
      down(event: MouseEvent) {
        downSince = event.timeStamp;
      },

      move(event: MouseEvent) {
        if (xPrev == null) xPrev = event.clientX;
        if (yPrev == null) yPrev = event.clientY;
        const x = event.clientX;
        const y = event.clientY;
        const dx = x - xPrev;
        const dy = y - yPrev;
        xPrev = x;
        yPrev = y;

        if (event.buttons !== 1) return;

        const wdx = scale.domToWorld * dx;
        const wdy = scale.domToWorld * dy;
        worldBounds.originX -= wdx;
        worldBounds.originY += wdy;
        draw.scene();
      },

      up(event: MouseEvent) {
        const duration = event.timeStamp - downSince;
        // too much motion doesn't count
        if (duration > clickTolerance) return;
        const [x, y] = conv.domToWorld(event.clientX, event.clientY);
        draw.keystones.push([x, y]);
        draw.scene();
      },

      scroll(event: WheelEvent) {
        const { deltaY } = event;
        const xCli = event.clientX;
        const yCli = event.clientY;

        const [x0, y0] = conv.domToWorld(xCli, yCli);

        const factor = deltaY > 0 ? scrollSpeed : 1 / scrollSpeed;

        scale.screenToWorld *= factor;
        init(); // changing a top level requires reinit

        const [x1, y1] = conv.domToWorld(xCli, yCli);
        const dx = x1 - x0;
        const dy = y1 - y0;

        worldBounds.originX -= dx;
        worldBounds.originY -= dy;
        draw.scene();
      },
    };
  })();
</script>

<svelte:window on:resize={onResize} />

<div role="application" class="border-black p-1 m-2 border-2 aspect-square">
  <canvas
    bind:this={canvas}
    class="border-2 border-black size-full"
    bind:clientWidth={domBounds.width}
    bind:clientHeight={domBounds.height}
    on:mousemove={mouse.move}
    on:mouseup={mouse.up}
    on:mousedown={mouse.down}
    on:wheel={mouse.scroll}
  >
  </canvas>
</div>

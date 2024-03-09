<script lang="ts">
  import "../../app.css";
  import {
    Bounds,
    type CanvasBrain,
    newCanvasBrain,
  } from "$lib/canvas/canvasBrain";
  import log from "$lib/log";

  let canvas: HTMLCanvasElement;
  const domBounds = new Bounds();
  let screenToWorld = 50;
  let domToCanvas = 1.2;

  let brain: CanvasBrain;

  function newBrain() {
    brain = newCanvasBrain(canvas, domBounds, screenToWorld, domToCanvas);
  }

  const draw = {
    keystones: [] as [number, number][],

    point(x: number, y: number, c: number, msg: string) {
      // map c to hue
      const color = `hsl(${c * 360}, 100%, 85%)`;
      brain.strokeStyle = color;

      brain.beginPath();
      const rad = 20;
      brain.lineWidth = 10;
      brain.arc(x, y, rad, 0, 2 * Math.PI);
      brain.stroke();

      brain.font = "30px serif";
      const xOff = (x - brain.canvasBounds.width / 2) / 4 + 80;
      const yOff = (y - brain.canvasBounds.height / 2) / 15;
      brain.fillText(msg, x - xOff, y - yOff);
    },

    screenPoint(x: number, y: number, c = 1, msg = "") {
      const [X, Y] = brain.conv.screenToCanvas(x, y);
      draw.point(
        X,
        Y,
        c,
        `s(${Math.round(x * 10) / 10}, ${Math.round(y * 10) / 10}) ${msg}`,
      );
    },

    worldPoint(x: number, y: number, c = 1, msg = "") {
      const [X, Y] = brain.conv.worldToCanvas(x, y);
      draw.point(X, Y, c, `w(${Math.round(x)}, ${Math.round(y)}) ${msg}`);
    },

    scene() {
      log(brain);
      brain.reset();

      for (let i = 0.2; i <= 0.8; i += 0.1) {
        const x = i;
        draw.screenPoint(x, x, (i - 0.2) / 0.8, Math.round(i * 10).toString());
      }

      draw.worldPoint(
        brain.worldBounds.originX,
        brain.worldBounds.originY,
        0,
        "origin",
      );
      const edgeX = brain.worldBounds.originX + brain.worldBounds.width;
      const edgeY = brain.worldBounds.originY + brain.worldBounds.height;
      draw.worldPoint(edgeX, edgeY, 0, "edge");

      for (const k of draw.keystones) {
        const [x, y] = k;
        draw.worldPoint(x, y, Math.random());
      }

      // drawing origin axis

      {
        draw.worldPoint(0, 0, 0);
        const [x0, y0] = brain.conv.worldToCanvas(0, 0);
        brain.beginPath();
        brain.lineWidth = 1;
        brain.moveTo(x0, 0);
        brain.lineTo(x0, brain.canvasBounds.height);
        brain.moveTo(0, y0);
        brain.lineTo(brain.canvasBounds.width, y0);
        brain.stroke();
      }
    },
  };

  function refresh() {
    newBrain();
    draw.scene();
  }

  $: if (canvas && domBounds.width) refresh();

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

        const wdx = brain.scaleFactors.domToWorld * dx;
        const wdy = brain.scaleFactors.domToWorld * dy;
        brain.worldBounds.originX -= wdx;
        brain.worldBounds.originY += wdy;
        draw.scene();
      },

      up(event: MouseEvent) {
        const duration = event.timeStamp - downSince;
        // too much motion doesn't count
        if (duration > clickTolerance) return;
        const [x, y] = brain.conv.domToWorld(event.clientX, event.clientY);
        draw.keystones.push([x, y]);
        draw.scene();
      },

      scroll(event: WheelEvent) {
        const { deltaY } = event;
        const xCli = event.clientX;
        const yCli = event.clientY;

        const [x0, y0] = brain.conv.domToWorld(xCli, yCli);

        const factor = deltaY > 0 ? scrollSpeed : 1 / scrollSpeed;

        screenToWorld *= factor;
        newBrain(); // changing a top level requires reinit

        const [x1, y1] = brain.conv.domToWorld(xCli, yCli);
        const dx = x1 - x0;
        const dy = y1 - y0;

        brain.worldBounds.originX -= dx;
        brain.worldBounds.originY -= dy;
        draw.scene();
      },
    };
  })();
</script>

<svelte:window on:resize={refresh} />

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

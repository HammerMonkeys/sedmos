<script lang="ts">
  import "../../app.css";
  import { Bounds, CanvasBrain } from "$lib/canvas/canvasBrain";
  import log from "$lib/log";

  let canvas: HTMLCanvasElement;
  const domBounds = new Bounds();
  let screenToWorld = 50;
  let domToCanvas = 1.2;

  let brain: CanvasBrain;

  function newBrain() {
    brain = new CanvasBrain(canvas, domBounds);
  }

  function refresh() {
    newBrain();
    brain.draw.scene();
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

        const wdx = brain.scale.domToWorld * dx;
        const wdy = brain.scale.domToWorld * dy;
        brain.worldBounds.originX -= wdx;
        brain.worldBounds.originY += wdy;
        brain.draw.scene();
      },

      up(event: MouseEvent) {
        const duration = event.timeStamp - downSince;
        // too much motion doesn't count
        if (duration > clickTolerance) return;
        const [x, y] = brain.conv.domToWorld(event.clientX, event.clientY);
        brain.draw.keystones.push([x, y]);
        brain.draw.scene();
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
        brain.draw.scene();
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

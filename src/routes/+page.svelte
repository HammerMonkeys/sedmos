<script lang="ts">
  import { MathQuill } from "svelte-mathquill";
  import { fly, slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { flip } from "svelte/animate"; // import flip from svelte/animate
  import { onMount } from "svelte";
  import { ceil, number } from "mathjs";
  import { abs } from "mathjs";
  import buildRenderer from "../lib/foreground";
  import log from "$lib/log";

  let latex_funcs: string[] = [""];

  function dragStart(event: DragEvent, index: number) {
    event.dataTransfer!.setData("text/plain", `${index}`);
  }

  function drop(event: DragEvent, index: number) {
    event.preventDefault();
    const draggedIndex: number = +event.dataTransfer!.getData("text/plain");
    const temp = latex_funcs[index];
    latex_funcs[index] = latex_funcs[draggedIndex];
    latex_funcs[draggedIndex] = temp;
    latex_funcs = [...latex_funcs];
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  let canvas: HTMLCanvasElement;
  let vporigin = { x: 0, y: 0 };
  let dragging = false;
  let previousPoint: { x: number; y: number } = { x: 0, y: 0 };
  let scale: number; // 11 horizontal squares

  let ctx: CanvasRenderingContext2D;
  $: renderChunk =
    canvas != undefined && ctx != undefined
      ? buildRenderer(canvas, ctx, latex_funcs)
      : null;

  function renderAllChunks() {
    if (!renderChunk) {
      return;
    }

    renderChunk([0, 0]);
    renderChunk([1, 0]);
    renderChunk([1, -1]);
  }

  onMount(() => {
    ctx = canvas.getContext("2d")!;
    scale = canvas.width / 11;
    drawGrid();

    function resizeCanvas(): void {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawGrid();
    }

    new ResizeObserver(resizeCanvas).observe(canvas);

    window.onresize = resizeCanvas;
    resizeCanvas();

    canvas.addEventListener("mousedown", (event) => {
      dragging = true;
      previousPoint = { x: event.clientX, y: event.clientY };
    });

    canvas.addEventListener("mousemove", (event) => {
      if (dragging) {
        vporigin.x += event.clientX - previousPoint.x;
        vporigin.y += event.clientY - previousPoint.y;
        previousPoint = { x: event.clientX, y: event.clientY };
        drawGrid();
      }
    });

    canvas.addEventListener("mouseup", (_) => {
      dragging = false;
    });
  });

  function cartToCanvas(coord: { x: number; y: number }) {
    var scale = canvas.width / 11;
    const xcenter = 6 * scale;
    var ycount = ceil(canvas.height / scale);
    const ycenter = (Math.round(ycount / 2) + 1) * scale;
    return {
      x: coord.x * scale + vporigin.x + xcenter,
      y: -coord.y * scale + vporigin.y + ycenter,
    };
  }

  function drawGrid() {
    if (!ctx) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const origin = cartToCanvas({ x: 3, y: -1 });
    ctx.fillRect(origin.x, origin.y, 3, 3);

    var spacing = canvas.width / 11;
    const xcount = 11;
    var ycount = ceil(canvas.height / spacing);
    while (ycount >= 55) {
      spacing *= 2;
      ycount = ceil(canvas.height / spacing);
    }

    const tl = { x: vporigin.x % spacing, y: vporigin.y % spacing };
    const tlcoord: { x: number; y: number } = {
      x:
        tl.x >= 0
          ? -Math.floor(xcount / 2) - Math.floor(vporigin.x / spacing)
          : -Math.ceil(xcount / 2) - Math.ceil(vporigin.x / spacing) + 1,
      y:
        tl.y >= 0
          ? Math.floor(ycount / 2) + Math.floor(vporigin.y / spacing)
          : Math.ceil(ycount / 2) + Math.ceil(vporigin.y / spacing),
    };
    console.log(tlcoord);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.2;
    for (let i = 0; i < xcount; i++) {
      // draw vertical
      const line = tlcoord.x + i - 1;
      // if (i % 5 == 0) {
      // 	ctx.lineWidth = 0.5;
      // 	ctx.fillText(String(i), i * spacing, canvas.height / 2);
      // }
      // i * spacing + tl.x adjusted for viewport origin is clsoe to 0

      // console.log(tl.x);

      if (line == 0) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "red";
      }
      ctx.beginPath();
      ctx.moveTo(i * spacing + tl.x, 0);
      ctx.lineTo(i * spacing + tl.x, canvas.height);
      ctx.stroke();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.2;
    }
    for (let i = 0; i < ycount; i++) {
      // draw horizontal
      const line = tlcoord.y - i + 1;

      // if (i % 5 == 0) {
      // 	ctx.lineWidth = 0.5;
      // }

      if (line == 0) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "red";
      }
      ctx.beginPath();
      ctx.moveTo(0, tl.y + i * spacing);
      ctx.lineTo(canvas.width, tl.y + i * spacing);
      ctx.stroke();
      ctx.lineWidth = 0.2;
    }

    renderAllChunks();
  }

  $: if (latex_funcs) {
    drawGrid();
    renderAllChunks();
  }
</script>

<body class="flex columns-2 h-screen w-screen bg-bg-900">
  <div
    id="functioncol"
    class="overflow-y-auto overflow-x-clip max-h-screen resize-x min-w-20 w-72"
  >
    {#each latex_funcs as _, index (index)}
      <div
        id="functioncontainer{index}"
        class="flex flex-nowrap flex-1 text-primary-300 bg-secondary-500 focus-within:bg-accent-500 focus-within:text-primary-900"
        draggable="true"
        on:dragstart={(event) => dragStart(event, index)}
        on:drop={(event) => drop(event, index)}
        on:dragover={(event) => onDragOver(event)}
        transition:slide={{ duration: 100, easing: cubicOut }}
        animate:flip={{ duration: 300, easing: cubicOut }}
        role="group"
      >
        <div class="w-12 text-xs pl-1 font-bold cursor-move">
          {index + 1}
        </div>
        <MathQuill
          class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-b-[1] focus:border-accent-500 active:border-accent-500 border-secondary-500 flex"
          bind:latex={latex_funcs[index]}
          autofocus
        />
      </div>
    {/each}
    <div
      role="button"
      id="functioncontainer"
      class="flex flex-nowrap flex-1 text-primary-300 bg-secondary-500 bg-gradient-to-b from-secondary-500 from-1% to-bg-900 to-70%"
      on:click={() => {
        latex_funcs = [...latex_funcs, ""];
      }}
      on:keypress={(e) => {
        if (e.key === "Enter") {
          latex_funcs = [...latex_funcs, ""];
        }
      }}
      tabindex="0"
    >
      <div class="w-12 text-xs pl-1 font-bold">
        {latex_funcs.length + 1}
      </div>
      <MathQuill
        class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-t-[2] border-l-[0] border-b-[0] border-r-[0] flex cursor-pointer"
      />
    </div>
  </div>
  <div id="graph" class="w-max bg-blue-100 flex-grow-[1]">
    <canvas bind:this={canvas} id="canvas" class="w-full h-full overflow-clip">
    </canvas>
  </div>
</body>

<style lang="postcss">
  :global(.mq-focused) {
    box-shadow: none !important;
    border-color: theme(colors.accent.500) !important;
  }

  :global(.mq-root-block) {
    display: block !important;
    align-self: center !important;
    caret-color: white !important;
  }

  :global(.mq-math-mode .mq-empty) {
    caret-color: white !important;
  }
  :global(.mq-overline) {
    caret-color: white !important;
  }
  :global(.mq-underline) {
    caret-color: white !important;
  }
  :global(.mq-overarrow .mq-editable-field .mq-selection.mq-blur .mq-matrixed) {
    caret-color: white !important;
    background-color: white !important;
    border-color: white !important;
    color: white !important;
  }

  :global(.mathquill-editable) {
    color: white !important;
    border-color: white !important;
  }
  :global(.mathquill-rendered-math .mq-cursor) {
    background: white !important;
  }
</style>

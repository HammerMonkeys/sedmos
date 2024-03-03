<script lang="ts">
	import { MathQuill } from "svelte-mathquill";
	import { fly, slide } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { flip } from "svelte/animate"; // import flip from svelte/animate
	import { onMount } from "svelte";
	import { ceil } from "mathjs";

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

	onMount(() => {
		const ctx = canvas.getContext("2d")!;
		drawGrid(ctx);

		function resizeCanvas(): void {
			canvas.width = canvas.clientWidth;
			canvas.height = canvas.clientHeight;
			drawGrid(ctx);
		}

		new ResizeObserver(resizeCanvas).observe(canvas);

		window.onresize = resizeCanvas;
		resizeCanvas();
	});

	function drawGrid(ctx: CanvasRenderingContext2D) {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		const spacing = canvas.width / 20;
		const ycount = ceil(canvas.height / spacing);
		ctx.strokeStyle = "black";
		ctx.lineWidth = 0.5;
		for (let i = 0; i < 20; i++) {
			ctx.beginPath();
			ctx.moveTo(i * spacing, 0);
			ctx.lineTo(i * spacing, canvas.height);
			ctx.stroke();
		}
		for (let i = 0; i < ycount; i++) {
			ctx.beginPath();
			ctx.moveTo(0, i * spacing);
			ctx.lineTo(canvas.width, i * spacing);
			ctx.stroke();
		}
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

<script lang="ts">
	import { onMount } from "svelte";
	import { ceil } from "mathjs";
	import buildRenderer from "$lib/foreground";
	import { GraphFunction } from "$lib/graphfunction";
	// import log from "$lib/log";

	// let latex_funcs: string[] = [""];
	export let graph_funcs: GraphFunction[] = [new GraphFunction()];
	let latex_funcs: string[] = graph_funcs.map((f) => f.latex);

	$: {
		latex_funcs = graph_funcs.map((f) => f.latex);
	}

	let tlbl: [number, number][] = [];
	$: top_left = tlbl ? tlbl[0] : null;
	$: bottom_right = tlbl ? tlbl[1] : null;

	//TODO: Rethink the drag algorithm eniterly for the grid, as well as the gridline generation
	let canvas: HTMLCanvasElement;
	let vporigin = { x: 0, y: 0 };
	let dragging = false;
	let previousPoint: { x: number; y: number } = { x: 0, y: 0 };
	let scale = 20; // # of square units horizontally (higher = zoomed out)
	let ctx: CanvasRenderingContext2D;
	$: squareSize = canvas ? canvas.width / scale : 0;

	// used in the foreground renderer
	$: w2sConv = (x: number, y: number) => {
		const canvasCoord = cartToCanvas({ x, y });
		return [canvasCoord.x, canvasCoord.y];
	};

	$: renderChunk =
		canvas != undefined && ctx != undefined
			? buildRenderer(canvas, ctx, w2sConv, latex_funcs)
			: null;

	function renderAllChunks() {
		if (!renderChunk) {
			return;
		}

		if (!bottom_right || !top_left) {
			return;
		}

		try {
			for (let x = -5; x < 5; x++) {
				for (let y = -3; y < 3; y++) {
					renderChunk([x, y]);
				}
			}

			// const chunkWidth = 5;
			// for (
			//   let x = Math.floor(top_left[0] / chunkWidth);
			//   x < bottom_right[0] / chunkWidth + 0.5;
			//   x++
			// ) {
			//   for (
			//     let y = Math.floor(bottom_right[1] / chunkWidth);
			//     y < top_left[1] / chunkWidth + 0.5;
			//     y++
			//   ) {
			//     // todo /20 should  correspond to chunkWidth
			//     renderChunk([x, y]);
			//   }
		} catch (err) {
			// pass
		}
	}

	onMount(() => {
		ctx = canvas.getContext("2d")!;
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
				vporigin.x += previousPoint.x - event.clientX;
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
		var squaresize = canvas.width / scale;
		const xcenter = Math.round(scale / 2) * squaresize;
		const ycenter = canvas.height / 2;

		return {
			x: coord.x * squaresize - vporigin.x + xcenter,
			y: -coord.y * squaresize + vporigin.y + ycenter,
		};
	}

	//TODO: Fix the y value conversion, seems to be slightly off so I need to reconsider the algorithm
	function canvasToCart(canvas2: { x: number; y: number }) {
		const xshift = vporigin.x / squareSize;
		const yshift = vporigin.y / squareSize;

		const leftBorderCart = xshift - scale / 2;
		const topBorderCart = yshift + canvas.height / squareSize / 2;

		const xCart = leftBorderCart + canvas2.x / squareSize;
		const yCart = topBorderCart - canvas2.y / squareSize;

		return {
			x: xCart,
			y: yCart,
		};
	}

	function getCenterCart() {
		return [vporigin.x / scale, vporigin.y / squareSize / 2];
	}

	// function TlBl(canvasX: number, canvasY, width: number, height: number) {
	function TlBl(width: number, height: number) {
		let cartCent = getCenterCart();

		let yCart = height / 2 / scale;
		let xCart = width / 2 / scale;

		const tl = [cartCent.at(0) - xCart, cartCent.at(1) + yCart];
		const bl = [cartCent.at(0) + xCart, cartCent.at(1) - yCart];

		return [tl, bl];
	}

	function drawGrid() {
		if (!ctx) return;
		console.log("\nTop y: " + canvasToCart({ x: 0, y: 0 }).y); // Top left??

		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;

		const origin = cartToCanvas({ x: 3, y: -1 });
		ctx.fillRect(origin.x, origin.y, 3, 3);

		var spacing = canvas.width / scale;
		const xcount = scale;
		var ycount = ceil(canvas.height / spacing);
		while (ycount >= 55) {
			spacing *= 2;
			ycount = ceil(canvas.height / spacing);
		}

		tlbl = TlBl(canvas.width, canvas.height);
		// console.log(tlbl);

		// TODO: Remove this tl coord strategy after the CanvastoCart function works correctly for y values.
		const tl = { x: vporigin.x % spacing, y: vporigin.y % spacing };
		const tlcoord: { y: number } = {
			y:
				tl.y >= 0
					? Math.floor(ycount / 2) + Math.floor(vporigin.y / spacing)
					: Math.ceil(ycount / 2) + Math.ceil(vporigin.y / spacing),
		};

		ctx.lineWidth = 0.2;
		//INFO: draw vertical grid lines
		for (let i = 0; i < scale + 1; i++) {
			const offset = vporigin.x % squareSize;
			const line = i * spacing - offset;

			if (Math.round(canvasToCart({ x: line, y: 0 }).x) == 0) {
				ctx.lineWidth = 1;
			}
			ctx.beginPath();
			ctx.moveTo(line, 0);
			ctx.lineTo(line, canvas.height);
			ctx.stroke();
			ctx.lineWidth = 0.2;
		}

		//WARNING: In the case of y, the line has to be drawn from the center outwards since you can't guarantee height
		//INFO: draw horizontal grid lines
		for (let i = 0; i < ceil(ycount / 2) + 1; i++) {
			const centerY = canvas.height / 2;
			const offset = vporigin.y % squareSize;

			const line = tlcoord.y - i + 1;
			const line1 = centerY + i * spacing + offset;
			const line2 = centerY - i * spacing + offset;

			console.log("Line1: " + Math.round(canvasToCart({ x: 0, y: line1 }).y));
			console.log("Line2: " + Math.round(canvasToCart({ x: 0, y: line2 }).y));
			if (Math.round(canvasToCart({ x: 0, y: line1 }).y) == 0) {
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(0, line1);
				ctx.lineTo(canvas.width, line1);
				ctx.stroke();
				ctx.lineWidth = 0.2;
				ctx.beginPath();
				ctx.moveTo(0, line2);
				ctx.lineTo(canvas.width, line2);
				ctx.stroke();
			} else if (Math.round(canvasToCart({ x: 0, y: line2 }).y) == 0) {
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(0, line2);
				ctx.lineTo(canvas.width, line2);
				ctx.stroke();
				ctx.lineWidth = 0.2;
				ctx.beginPath();
				ctx.moveTo(0, line1);
				ctx.lineTo(canvas.width, line1);
				ctx.stroke();
			} else {
				ctx.lineWidth = 0.2;
				ctx.beginPath();
				ctx.moveTo(0, line1);
				ctx.lineTo(canvas.width, line1);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, line2);
				ctx.lineTo(canvas.width, line2);
				ctx.stroke();
			}
		}

		renderAllChunks();
	}

	$: if (latex_funcs) {
		drawGrid();
		renderAllChunks();
	}
</script>

<div id="graph" class="w-max bg-blue-100 flex-grow-[1]">
	<canvas
		bind:this={canvas}
		id="canvas"
		class="w-full h-full overflow-clip bg-bg-200"
		tabindex="0"
		on:keypress={(e) => {
			if (e.key === "Z") {
				scale = scale + 1;
				latex_funcs = latex_funcs;
			} else if (e.key === "z") {
				scale = scale - 1;
				latex_funcs = latex_funcs;
			}
		}}
	>
	</canvas>
</div>

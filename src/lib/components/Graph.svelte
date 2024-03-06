<script lang="ts">
	import { onMount } from "svelte";
	import { ceil, number } from "mathjs";
	import buildRenderer from "$lib/foreground";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { GraphFunction } from "$lib/graphfunction";
	// import log from "$lib/log";

	// let latex_funcs: string[] = [""];
	export let graph_funcs: GraphFunction[] = [new GraphFunction()];
	let latex_funcs: string[] = graph_funcs.map((f) => f.latex);

	$: {
		latex_funcs = graph_funcs.map((f) => f.latex);
		console.log(latex_funcs);
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
		var ycount = ceil(canvas.height / squaresize);
		const ycenter = (Math.round(ycount / 2) + 1) * squaresize;
		return {
			x: coord.x * squaresize - vporigin.x + xcenter,
			y: -coord.y * squaresize + vporigin.y + ycenter,
		};
	}

	function canvasToCart(canvas2: { x: number; y: number }) {
		const xshift = vporigin.x / squareSize;
		const yshift = vporigin.y / squareSize;

		// const tlCartx = getCenterCart()[0].

		const center = [vporigin.x / squareSize, vporigin.y / squareSize];
		const leftBorderCart = center[0] - scale / 2;
		const topBorderCart = center[1] + canvas.height / squareSize / 2;
		console.log("Centery : " + center[1]);
		console.log("Top border: " + topBorderCart);

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
		// console.log(getCenterCart());
		// console.log(vporigin);

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

		ctx.lineWidth = 0.2;
		for (let i = 0; i < scale + 1; i++) {
			// draw vertical
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
		for (let i = 0; i < ycount; i++) {
			const offset = vporigin.y % squareSize;
			// const line = i * spacing - offset;
			// draw horizontal
			const line = tlcoord.y - i + 1;

			// if (Math.round(canvasToCart({ x: 0, y: line }).y) == 0) {
			console.log("Horizontal line: y=" + canvasToCart({ x: 0, y: line }).y);
			if (line == 0) {
				ctx.lineWidth = 1;
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

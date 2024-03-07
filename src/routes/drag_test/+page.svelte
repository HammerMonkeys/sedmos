<script lang="ts">
	import { flip } from "svelte/animate";
	import { onMount } from "svelte";

	const items = [
		{ id: 1, val: 1, node: null },
		{ id: 2, val: 2, node: null },
		{ id: 3, val: 3, node: null },
	];

	let targets: HTMLElement[] = [];

	function draggable(node: HTMLElement, params: { axis: "x" | "y" | "xy" }) {
		let x: number;
		let y: number;
		let originalX = parseInt(node.style.left);
		let originalY = parseInt(node.style.top);
		targets.push(node);
		console.log(targets);
		let activeswap = false;

		var bounds = {
			left: node.getBoundingClientRect().left,
			top: node.getBoundingClientRect().top,
			right: node.getBoundingClientRect().right,
			bottom: node.getBoundingClientRect().bottom,
		};

		console.log("left: ", bounds.left);
		console.log("top: ", bounds.top);

		function handleMouseDown(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;

			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}

		function handleMouseMove(event: MouseEvent) {
			const dx = event.clientX - x;
			const dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			if (params.axis === "x") {
				node.style.left = `${parseInt(node.style.left) + dx}px`;
			} else if (params.axis === "y") {
				node.style.top = `${parseInt(node.style.top) + dy}px`;
			} else {
				node.style.left = `${parseInt(node.style.left) + dx}px`;
				node.style.top = `${parseInt(node.style.top) + dy}px`;
			}
			if (!activeswap) {
				activeswap = true;
				requestAnimationFrame(() => {
					node.dispatchEvent(
						new CustomEvent("dragmove", {
							detail: { x, y, dx, dy },
						}),
					);
				});
			}
			// node.dispatchEvent(
			// 	new CustomEvent("dragmove", {
			// 		detail: { x, y, dx, dy },
			// 	}),
			// );
		}

		function handleMouseUp(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;
			node.style.left = `${originalX}px`;
			node.style.top = `${originalY}px`;
			node.dispatchEvent(
				new CustomEvent("dragend", {
					detail: { x, y },
				}),
			);

			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		}

		node.addEventListener("dragmove", (event: CustomEvent) => {
			for (let i = 0; i < targets.length; i++) {
				if (
					event.detail.x > targets[i].getBoundingClientRect().left &&
					event.detail.x < targets[i].getBoundingClientRect().right
				) {
					const cur = targets.findIndex((el) => el === node);
					const temp = items[i];
					items[i] = items[cur];
					items[cur] = temp;
				}
			}
			setTimeout(() => {
				activeswap = false;
			}, 300);
		});

		onMount(() => {
			node.addEventListener("mousedown", handleMouseDown);

			return () => {
				node.removeEventListener("mousedown", handleMouseDown);
			};
		});

		return {
			destroy() {
				node.removeEventListener("mousedown", handleMouseDown);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			},
		};
	}
</script>

<div class="container">
	{#each items as item, index (item.id)}
		<div
			use:draggable={{ axis: "xy" }}
			class="item draggable"
			style="top: 0; left: {index * 120}px;"
			animate:flip={{ duration: 100 }}
		>
			{item.val}
		</div>
	{/each}
</div>

<style>
	.draggable {
		cursor: grab;
		user-select: none; /* Prevent selection to improve drag experience */
	}
	.container {
		width: 100%;
		height: 100vh;
		position: relative; /* Allows absolute positioning inside */
	}
	.item {
		width: 100px;
		height: 100px;
		margin: 10px;
		background-color: #bada55;
		position: absolute; /* Positioned absolutely to the container */
	}
</style>

<script lang="ts" module="script">
	import { flip } from "svelte/animate";
	import { onMount } from "svelte";

	const items: { id: number; val: number; node: HTMLElement | null }[] = [
		{ id: 1, val: 1, node: null },
		{ id: 2, val: 2, node: null },
		{ id: 3, val: 3, node: null },
	];

	let dragging: HTMLElement | null = null;

	export function draggable(
		node: HTMLElement,
		params: { axis: "x" | "y" | "xy"; id: number },
	) {
		let x: number;
		let y: number;
		let clone = null;
		let cloneX = 0;
		let cloneY = 0;
		items.findIndex((el) => {
			if (el.id === params.id) {
				el.node = node;
			}
		});
		let index = items.findIndex((el) => el.id === params.id);

		let activeswap = false;

		function handleMouseDown(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;
			dragging = node;
			clone = node.cloneNode(true);
			node.cloneNode(true) as HTMLElement;
			document.body.appendChild(clone);
			node.style.opacity = "0";

			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}

		function handleMouseMove(event: MouseEvent) {
			const dx = event.clientX - x;
			const dy = event.clientY - y;
			x = event.clientX;
			y = event.clientY;
			cloneX += dx;
			if (params.axis === "x") {
				clone!.style.transform = `translate(${cloneX}px, 0)`;
			} else if (params.axis === "y") {
				clone!.style.top = `${parseInt(clone!.style.top) + dy}px`;
			} else {
				clone!.style.left = `${parseInt(clone!.style.left) + dx}px`;
				clone!.style.top = `${parseInt(clone!.style.top) + dy}px`;
			}
			if (!activeswap) {
				node.dispatchEvent(
					new CustomEvent("dragmove", {
						detail: { x, y, dx, dy },
					}),
				);
			}
		}

		function handleMouseUp(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;
			dragging = null;
			node.dispatchEvent(
				new CustomEvent("dragend", {
					detail: { x, y },
				}),
			);
			clone!.remove();
			cloneX = 0;
			cloneY = 0;
			node.style.opacity = "1";

			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		}

		node.addEventListener("dragmove", (event: CustomEvent) => {
			for (let i = 0; i < items.length; i++) {
				if (
					event.detail.x > items[i].node.getBoundingClientRect().left &&
					event.detail.x < items[i].node.getBoundingClientRect().right &&
					items[i].node !== dragging && // Check if the current node is not the dragging node
					!activeswap
				) {
					activeswap = true;
					const temp = items[i];
					items[i] = items[index];
					items[index] = temp;

					console.log("Index is " + index + " and i is " + i);
					items[index].node.dispatchEvent(
						new CustomEvent("indexchange", { detail: { index: index } }),
					);
					items[i].node.dispatchEvent(
						new CustomEvent("indexchange", { detail: { index: i } }),
					);
					console.log("\n");
				}
			}
			setTimeout(() => {
				activeswap = false;
			}, 500);
		});

		node.addEventListener("indexchange", (event: CustomEvent) => {
			console.log("Changing index " + index + " to " + event.detail.index);
			index = event.detail.index;
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
			use:draggable={{ axis: "x", id: item.id }}
			class="item draggable"
			style="top: 0; left: {index * 120}px;"
			animate:flip={{ duration: 100 }}
		>
			{item.val}
		</div>
	{/each}
	<div class="pt-52" style="top: 200px; left: 200px;">Items list info</div>
	<br />
	{#each items as item, index (item.id)}
		<p>
			Index: {index}
			ID: {item.id}
		</p>
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

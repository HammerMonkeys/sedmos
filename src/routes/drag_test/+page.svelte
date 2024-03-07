<script lang="ts">
	import { onMount } from "svelte";

	function draggable(node: HTMLElement, params: { axis: "x" | "y" | "xy" }) {
		let x: number;
		let y: number;

		function handleMouseDown(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;
			node.dispatchEvent(
				new CustomEvent("dragstart", {
					detail: { x, y },
				}),
			);

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
			node.dispatchEvent(
				new CustomEvent("dragmove", {
					detail: { x, y, dx, dy },
				}),
			);
		}

		function handleMouseUp(event: MouseEvent) {
			x = event.clientX;
			y = event.clientY;
			node.dispatchEvent(
				new CustomEvent("dragend", {
					detail: { x, y },
				}),
			);

			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		}

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
	<div
		use:draggable={{ axis: "xy" }}
		class="item draggable"
		style="top: 0; left: 0;"
	>
		XY lock
	</div>
	<div
		use:draggable={{ axis: "y" }}
		class="item draggable"
		style="top: 0; left: 120px;"
	>
		Y LOCK
	</div>
	<div
		use:draggable={{ axis: "x" }}
		class="item draggable"
		style="top: 0; left: 240px;"
	>
		X LOCK
	</div>
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

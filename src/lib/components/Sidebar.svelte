<script lang="ts">
	import { MathQuill } from "svelte-mathquill";
	import { slide } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { flip } from "svelte/animate";
	import { GraphFunction } from "$lib/graphfunction";

	export let graph_funcs: GraphFunction[] = [new GraphFunction()];

	// TODO: (painful) make an animation for the drag and drop which locks the "y" (vertical) axis
	function dragStart(event: DragEvent, index: number) {
		event.dataTransfer!.setData("text/plain", `${index}`);
	}

	function drop(event: DragEvent, index: number) {
		event.preventDefault();
		const draggedIndex: number = +event.dataTransfer!.getData("text/plain");
		const temp = graph_funcs[index];
		graph_funcs[index] = graph_funcs[draggedIndex];
		graph_funcs[draggedIndex] = temp;
		graph_funcs = [...graph_funcs];
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
	}
</script>

<div
	id="sidebar"
	class="overflow-y-auto overflow-x-clip max-h-screen resize-x min-w-20 w-72"
>
	{#each graph_funcs as func, index (func.key)}
		<div
			id="functioncontainer{index}"
			class="flex flex-nowrap flex-1 text-primary-300 bg-secondary-500 focus-within:bg-accent-500 focus-within:text-primary-900"
			draggable="true"
			on:dragstart={(event) => dragStart(event, index)}
			on:drop={(event) => drop(event, index)}
			on:dragover={(event) => onDragOver(event)}
			animate:flip={{ duration: 200, easing: cubicOut }}
			transition:slide={{ duration: 100, easing: cubicOut }}
			role="group"
		>
			<div class="w-12 text-xs pl-1 font-bold cursor-move">
				{index + 1}
			</div>
			<MathQuill
				class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-b-[1] focus:border-accent-500 active:border-accent-500 border-secondary-500 flex"
				bind:latex={graph_funcs[index].latex}
				autofocus
			/>
			<button
				on:click={() => {
					if (index === 0) return;
					const temp = graph_funcs[index];
					graph_funcs[index] = graph_funcs[index - 1];
					graph_funcs[index - 1] = temp;
					graph_funcs = graph_funcs;
				}}
			>
				flip
			</button>
		</div>
	{/each}
	<!--TODO: Figure out why, on vercel, this button doesn't appear the same as locally (specifically the borders) -->
	<!--TODO: Further, I think the general application of the fading can be improved to look better rather than manually hacking away the borders -->
	<div
		role="button"
		id="functionAdd"
		class="flex flex-nowrap flex-1 text-primary-300 bg-secondary-500 bg-gradient-to-b from-secondary-500 from-1% to-bg-900 to-70%"
		on:click={() => {
			graph_funcs = [...graph_funcs, new GraphFunction()];
		}}
		on:keypress={(e) => {
			if (e.key === "Enter") {
				graph_funcs = [...graph_funcs, new GraphFunction()];
			}
		}}
		tabindex="0"
	>
		<div class="w-12 text-xs pl-1 font-bold">
			{graph_funcs.length + 1}
		</div>
		<MathQuill
			class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-t-[2] border-l-[0] border-b-[0] border-r-[0] flex cursor-pointer"
		/>
	</div>
</div>

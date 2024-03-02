<script lang="ts">
	import { MathQuill } from "svelte-mathquill";

	let latex_funcs: string[] = [""];
</script>

<body class="flex columns-2 h-screen w-screen bg-bg-900">
	<div
		id="functioncol"
		class="overflow-y-auto overflow-x-clip max-h-screen resize-x min-w-20"
	>
		{#each latex_funcs as _, index (index)}
			<div id="functioncontainer" class="flex flex-nowrap bg-gray-500 flex-1">
				<div
					class="bg-secondary-900 w-8 min-w-8 text-xs text-primary-300 pl-1 border-r-[1] border-accent-500"
				>
					{index + 1}
				</div>
				<MathQuill
					class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-b-[1] active:border-accent-500 border-secondary-500 flex"
					bind:latex={latex_funcs[index]}
				/>
			</div>
		{/each}
		<button
			id="addfunc"
			class="flex flex-nowrap bg-gray-500 flex-1"
			on:click={() => (latex_funcs = [...latex_funcs, ""])}
		>
			<div class="bg-gray-200 h-max w-8 border-r-black">
				{latex_funcs.length + 1}
			</div>
			<div class="flex-grow-[5] w-40 resize">Add Function</div>
		</button>
	</div>
	<div id="graph" class="w-max bg-blue-100 flex-grow-[1]">
		<canvas id="canvas" class="w-max"> </canvas>
	</div>
</body>

<style lang="postcss">
	:global(.mq-focused) {
		box-shadow: none !important;
	}

	:global(.mq-root-block) {
		display: block !important;
		align-self: center !important;
	}
</style>

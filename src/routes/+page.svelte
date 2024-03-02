<script lang="ts">
	import { MathQuill } from "svelte-mathquill";

	let latex_funcs: string[] = [""];
</script>

<body class="flex columns-2 h-screen w-screen">
	<div id="functioncol" class="overflow-y-auto max-h-screen">
		{#each latex_funcs as func, index (index)}
			<div id="functioncontainer" class="flex flex-nowrap bg-gray-500 flex-1">
				<div class="bg-gray-50 h-max w-8">{index}</div>
				<!-- <MathQuill bind:latex[index] /> -->
				<MathQuill bind:latex={latex_funcs[index]} />
			</div>
		{/each}
		<button
			class="bg-yellow-400"
			on:click={() => (latex_funcs = [...latex_funcs, ""])}
		>
			Add func</button
		>
	</div>
	<div id="graph" class="w-max bg-blue-400 flex-grow-[3]">
		<canvas id="canvas" class="w-max"> </canvas>
	</div>
</body>

<!-- :global(.mq-math-mode) { -->
<!-- 	border: none !important; -->
<!-- } -->
<!---->
<!-- :global(.mq-matrixed) { -->
<!-- 	background: black; -->
<!-- } -->
<!---->
<!-- :global(.mq-matrixed-container) { -->
<!-- 	background: black; -->
<!-- } -->

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.100);
	}
</style>

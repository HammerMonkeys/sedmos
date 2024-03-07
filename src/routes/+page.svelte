<script lang="ts">
	import { GraphFunction } from "$lib/graphfunction";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import Graph from "$lib/components/Graph.svelte";

	let graph_funcs: GraphFunction[] = [new GraphFunction()]; // Shared between components
</script>

<body class="flex columns-2 h-screen w-screen bg-bg-900">
	<Sidebar bind:graph_funcs />
	<Graph bind:graph_funcs />
</body>

<!-- TODO: Figure out how to properly style the mathquil cursor -->
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

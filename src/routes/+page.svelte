<script lang="ts">
	const functions = [
		"x = y",
		"y = x",
		"x = y + 1",
		"y = x + 1",
		"2x^2 = 3",
		"2y^2 = 3",
		"x^2 + y^2 = 1",
	];
</script>

<body class="flex flex-row columns-2 h-screen">
	<div
		id="functioncol"
		class="flex flex-col flex-nowrap columns-1 h-max bg-red-50"
	>
		{#each functions as func, index (index)}
			<div id="functioncontainer" class="m-2 p-2 bg-gray-50">{func}</div>
		{/each}
	</div>
	<div id="graph" class="w-max bg-blue-400">
		<canvas id="canvas" class="w-max"> </canvas>
	</div>
</body>

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.100);
	}
</style>

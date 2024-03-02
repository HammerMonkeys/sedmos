<script lang="ts">
	const functions = [
		"x = y",
		"y = x",
		"x = y + 1",
		"y = x + 1",
		"2x^2 = 3",
		"2y^2 = 3",
		"x^2 + y^2 = 1",
		"x^2 + y^2 = 1111111111111111",
	];
</script>

<body class="flex columns-2 h-screen w-screen">
	<div id="functioncol" class="overflow-y-auto max-h-screen">
		{#each functions as func, index (index)}
			<div id="functioncontainer" class="flex flex-nowrap bg-gray-500 flex-1">
				<div class="bg-gray-50 h-max w-8">{index}</div>
				<div>{func}</div>
			</div>
		{/each}
	</div>
	<div id="graph" class="w-max bg-blue-400 flex-grow-[3]">
		<canvas id="canvas" class="w-max"> </canvas>
	</div>
</body>

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.100);
	}
</style>

<script lang="ts">
	const functions = ["x = y", "y = x", "x = y + 1", "y = x + 1"];
</script>

<body class="flex-row columns-2">
	<div id="functions" class="">
		<div id="functioncol" class="flex-col">
			{#each functions as func, index (index)}
				<div>{func}</div>
			{/each}
		</div>
	</div>
	<div>
		<canvas id="canvas"> </canvas>
	</div>
</body>

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.100);
	}
</style>

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
			<div
				id="functioncontainer"
				class="flex flex-nowrap flex-1 text-primary-300 bg-secondary-500 focus-within:bg-accent-500 focus-within:text-primary-900"
			>
				<div class="w-12 text-xs pl-1 font-bold">
					{index + 1}
				</div>
				<MathQuill
					class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-b-[1] focus:border-accent-500 active:border-accent-500 border-secondary-500 flex"
					bind:latex={latex_funcs[index]}
				/>
			</div>
		{/each}
		<div
			role="button"
			id="functioncontainer"
			class="flex flex-nowrap flex-1 text-primary-300 bg-secondary-500 focus-within:bg-accent-500 focus-within:text-primary-900 bg-gradient-to-b from-secondary-500 from-1% to-bg-900 to-70%"
			on:click={() => (latex_funcs = [...latex_funcs, ""])}
			on:keypress={(e) => {
				if (e.key === "Enter") {
					latex_funcs = [...latex_funcs, ""];
				}
			}}
			tabindex="0"
		>
			<div class="w-12 text-xs pl-1 font-bold">
				{latex_funcs.length + 1}
			</div>
			<MathQuill
				class="bg-bg-900 text-primary-100 w-full p-4 min-h-16 border-l-[0] border-b-[0] focus:border-accent-500 active:border-accent-500 border-secondary-500 flex"
			/>
		</div>
	</div>
	<div id="graph" class="w-max bg-blue-100 flex-grow-[1]">
		<canvas id="canvas" class="w-max"> </canvas>
	</div>
</body>

<!-- @appy border-accent-500; -->

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

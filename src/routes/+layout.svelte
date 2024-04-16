<script>
	import "../app.css";
	import { MathQuillSetup } from "svelte-mathquill";

	import { dev } from "$app/environment";
	import { inject } from "@vercel/analytics";
	import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";

	injectSpeedInsights();
	inject({ mode: dev ? "development" : "production" });
</script>

<MathQuillSetup />

<slot />

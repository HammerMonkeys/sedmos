import colors from "tailwindcss/colors.js";

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{html,js,svelte,ts}"],
	theme: {
		extend: {
			colors: {
				primary: colors.neutral,
				secondary: colors.slate,
				// bg: colors.trueGray,
				bg: colors.gray,
				accent: colors.cyan,
			},
		},
	},
	plugins: [],
};

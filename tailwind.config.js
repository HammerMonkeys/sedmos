/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        primary: colors.slate,
        bg: colors.slate,
        accent: colors.rose,
      },
    },
  },
  plugins: [],
};

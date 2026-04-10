import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  site: "https://explorediscgolf.org",

  adapter: vercel(),

  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()],
  },
});

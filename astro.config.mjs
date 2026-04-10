import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  site: "https://explorediscgolf.org",

  adapter: node({
    mode: "standalone",
  }),

  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()],
  },
});

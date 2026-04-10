import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  site: "https://explorediscgolf.org",

  adapter: vercel({
    maxDuration: 30,
  }),

  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()],
  },
});

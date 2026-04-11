import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  output: "server",
  site: "https://explorediscgolf.org",

  adapter: vercel({
    maxDuration: 30,
  }),

  integrations: [
    svelte(),
    sitemap({
      customPages: [
        "https://explorediscgolf.org/explore-act/overview",
        "https://explorediscgolf.org/explore-act/legislative-history",
        "https://explorediscgolf.org/explore-act/key-provisions",
        "https://explorediscgolf.org/explore-act/accessibility",
        "https://explorediscgolf.org/explore-act/good-neighbor-authority",
        "https://explorediscgolf.org/explore-act/volunteer-stewardship",
        "https://explorediscgolf.org/explore-act/permitting-reform",
        "https://explorediscgolf.org/explore-act/implementation-status",
        "https://explorediscgolf.org/case-studies/three-peaks",
        "https://explorediscgolf.org/case-studies/ironside",
        "https://explorediscgolf.org/case-studies/stewart-pond",
        "https://explorediscgolf.org/case-studies/ward-mountain",
        "https://explorediscgolf.org/case-studies/barnes-grade",
      ],
      filter: (page) => !page.includes("/AGENTS"),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});

import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],

  theme: {
    extend: {},
  },

  plugins: [daisyui],

  daisyui: {
    themes: [
      {
        explore: {
          "primary": "#B85C38",          // Terra Cotta
          "primary-content": "#FEFDFB",  // Snow
          "secondary": "#5B7F3B",        // Sage
          "secondary-content": "#FEFDFB",
          "accent": "#D4952B",           // Summit Gold
          "accent-content": "#1E2D3B",   // Night Sky
          "neutral": "#1E2D3B",          // Night Sky
          "neutral-content": "#F5F0E8",  // Sandstone
          "base-100": "#FEFDFB",         // Snow
          "base-200": "#F5F0E8",         // Sandstone
          "base-300": "#EBE5DA",         // Darker sandstone
          "base-content": "#1E2D3B",     // Night Sky
          "info": "#1A8BA3",             // Basin Teal
          "info-content": "#FEFDFB",
          "success": "#3D8B37",          // Trail Green
          "success-content": "#FEFDFB",
          "warning": "#E8A93E",          // Amber
          "warning-content": "#1E2D3B",
          "error": "#C4422B",            // Signal Red
          "error-content": "#FEFDFB",
        },
      },
    ],
  },
};

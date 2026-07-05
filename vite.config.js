import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
    }),
  ],
});

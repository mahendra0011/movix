import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouterGenerator } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

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
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackRouterGenerator({
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.js",
      disableTypes: true,
      quoteStyle: "double",
      semicolons: true,
      routeTreeFileHeader: ["/* eslint-disable */", "// noinspection JSUnusedGlobalSymbols"],
    }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      router: {
        routesDirectory: "app/routes",
        generatedRouteTree: "../.tanstack/start-routeTree.gen.js",
        disableTypes: true,
      },
      server: { entry: "server" },
    }),
    nitro(),
    react(),
  ],
});

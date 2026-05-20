import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const isReplit = !!process.env.REPL_ID;

// PORT is only required when running the dev server, not during `vite build`
const rawPort = process.env.PORT;
let port = 3000;
if (rawPort) {
  port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
} else if (!isProduction) {
  throw new Error("PORT environment variable is required for the dev server.");
}

// BASE_PATH defaults to "/" — safe for Vercel and standard deployments
const basePath = process.env.BASE_PATH ?? "/";

async function replitPlugins() {
  if (!isReplit || isProduction) return [];
  const [runtimeError, cartographer, devBanner] = await Promise.all([
    import("@replit/vite-plugin-runtime-error-modal"),
    import("@replit/vite-plugin-cartographer"),
    import("@replit/vite-plugin-dev-banner"),
  ]);
  return [
    runtimeError.default(),
    cartographer.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
    devBanner.devBanner(),
  ];
}

export default defineConfig(async () => ({
  base: basePath,
  plugins: [react(), tailwindcss(), ...(await replitPlugins())],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
}));

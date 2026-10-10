// apps/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build version, e.g. "261010.1432" (UTC). Compared against /version.json at runtime.
const stamp = new Date().toISOString().replace(/\D/g, "");
const APP_VERSION = `${stamp.slice(2, 8)}.${stamp.slice(8, 12)}`;

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    {
      name: "emit-version-json",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ version: APP_VERSION }),
        });
      },
    },
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    // ensure single React instance across workspaces
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});

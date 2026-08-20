import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      name: "SfMetadataCopilotContent",
      formats: ["iife"],
      fileName: () => "content.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true
      }
    }
  }
});

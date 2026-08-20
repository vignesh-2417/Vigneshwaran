import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/background/serviceWorker.ts"),
      name: "SfMetadataCopilotBackground",
      formats: ["es"],
      fileName: () => "background.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});

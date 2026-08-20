import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const PROCESS_SHIM =
  '/*SF_METADATA_COPILOT_CONTENT_V2*/var process={env:{NODE_ENV:"production"}};';

function prependProcessShim(): Plugin {
  return {
    name: "prepend-process-shim",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = PROCESS_SHIM + chunk.code;
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), prependProcessShim()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({ NODE_ENV: "production" })
  },
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

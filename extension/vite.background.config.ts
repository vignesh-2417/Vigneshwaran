import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";

const PROCESS_SHIM = 'var process={env:{NODE_ENV:"production"}};';

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
  plugins: [prependProcessShim()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({ NODE_ENV: "production" })
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/background/serviceWorker.ts"),
      name: "SfMetadataCopilotBackground",
      formats: ["es"],
      fileName: () => "background.js"
    }
  }
});

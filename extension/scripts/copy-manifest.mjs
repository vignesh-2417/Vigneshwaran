import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "dist");
mkdirSync(destDir, { recursive: true });
copyFileSync(join(root, "manifest.json"), join(destDir, "manifest.json"));
copyFileSync(join(root, "process-shim.js"), join(destDir, "process-shim.js"));

const dest = join(destDir, "manifest.json");
const manifest = JSON.parse(readFileSync(dest, "utf8"));
if (manifest.background?.service_worker) {
  manifest.background.service_worker = manifest.background.service_worker.replace(/^dist\//, "");
}
if (Array.isArray(manifest.content_scripts)) {
  for (const script of manifest.content_scripts) {
    if (Array.isArray(script.js)) {
      script.js = script.js.map((entry) => entry.replace(/^dist\//, ""));
    }
  }
}
writeFileSync(dest, `${JSON.stringify(manifest, null, 2)}\n`);

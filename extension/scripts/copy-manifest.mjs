import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "../dist");
mkdirSync(dist, { recursive: true });

const sourcePath = resolve(root, "../manifest.json");
const destPath = resolve(dist, "manifest.json");
copyFileSync(sourcePath, destPath);

const sourceManifest = JSON.parse(readFileSync(sourcePath, "utf8"));
const distManifest = JSON.parse(JSON.stringify(sourceManifest));
distManifest.background.service_worker = distManifest.background.service_worker.replace(
  /^dist\//,
  ""
);
distManifest.content_scripts = distManifest.content_scripts.map((script) => ({
  ...script,
  js: script.js.map((entry) => entry.replace(/^dist\//, ""))
}));
writeFileSync(destPath, `${JSON.stringify(distManifest, null, 2)}\n`);

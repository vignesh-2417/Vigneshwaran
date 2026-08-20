import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const bundle = join(process.cwd(), "dist", "content.js");
const shim = join(process.cwd(), "dist", "process-shim.js");
if (!existsSync(bundle)) {
  console.error("Missing dist/content.js");
  process.exit(1);
}
if (!existsSync(shim)) {
  console.error("Missing dist/process-shim.js (copied from extension/process-shim.js)");
  process.exit(1);
}

const source = readFileSync(bundle, "utf8");
const failures = [];

if (!source.startsWith('var process={env:{NODE_ENV:')) {
  failures.push("content.js must start with a process.env shim so Lightning pages do not crash");
}

if (source.includes("react.development.js")) {
  failures.push("content.js still contains react.development.js");
}

if (source.includes("process.env.NODE_ENV")) {
  failures.push("content.js still contains leftover process.env.NODE_ENV");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log("content.js production bundle checks passed");

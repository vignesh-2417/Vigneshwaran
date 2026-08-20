import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), "dist/content.js");
const source = readFileSync(file, "utf8");
const failures = [];

if (!source.startsWith("var process={env:{NODE_ENV:")) {
  failures.push("content.js must start with a process.env NODE_ENV shim");
}
if (source.includes("react.development.js")) {
  failures.push("content.js must not include React development sources");
}
if (source.includes("process.env.NODE_ENV")) {
  failures.push("content.js must not contain leftover process.env.NODE_ENV lookups");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("content.js bundle checks passed");

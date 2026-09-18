/* Isolated-world shim. Content scripts have no Node `process`.
   Must run before content.js so React's NODE_ENV checks do not throw. */
/* SF_METADATA_COPILOT_CONTENT_V2 */
globalThis.process = globalThis.process || { env: { NODE_ENV: "production" } };

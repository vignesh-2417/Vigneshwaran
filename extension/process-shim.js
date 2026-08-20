/* Isolated-world shim. Content scripts have no Node `process`.
   Must run before content.js so React's NODE_ENV checks do not throw. */
globalThis.process = globalThis.process || { env: { NODE_ENV: "production" } };

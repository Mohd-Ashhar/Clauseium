// CommonJS shim that pre-populates require.cache with an empty module for
// `server-only`, so CLI scripts (run via tsx) don't trip its default-export
// throw. tsx compiles TS imports to CJS requires, so the ESM resolver hook
// alone isn't enough — we need both.

const Module = require("node:module");
const path = require("node:path");

const original = Module._resolveFilename;
const target = path.resolve(__dirname, "server-only-empty.cjs");

Module._resolveFilename = function patched(request, parent, ...rest) {
  if (request === "server-only") return target;
  return original.call(this, request, parent, ...rest);
};

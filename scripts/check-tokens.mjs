#!/usr/bin/env node
// Tokens-only guardrail. Prevents the violet/dev-tool regressions we removed
// from creeping back in. Run via `npm run check:tokens` (and in CI).
//
// Rules:
//  1. No demoted violet `brand-*` token usage in the logged-in app / workspace
//     (those surfaces must use counsel-gold).
//  2. No hardcoded violet hex/rgba anywhere under src/ (use globals.css tokens).
//  3. No banned "legal advice" phrase in user-facing copy (allowed only in the
//     guard/prompt code that enforces the ban).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const violations = [];
const add = (file, line, msg) =>
  violations.push(`${relative(ROOT, file)}:${line}  ${msg}`);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name)) check(p);
  }
}

const VIOLET_HEX = /#(7c5cff|6b46ff|9d80ff|b5a0ff|d4c8ff|e8dfff|f5f1ff)/i;
const VIOLET_RGBA = /rgba?\(\s*(124\s*,\s*92\s*,\s*255|80\s*,\s*110\s*,\s*255)/i;
const BRAND_TOKEN = /\bbrand-(50|100|200|300|400|500|600)\b/;
const APP_SURFACE = /\/src\/components\/(app|uploads)\//;
const ENFORCES_BAN = /never use|forbidden|legal information|legal analysis/i;

function check(file) {
  const text = readFileSync(file, "utf8");
  const isTokenDefs = file.endsWith("globals.css");
  const lines = text.split("\n");
  lines.forEach((ln, i) => {
    const n = i + 1;
    // globals.css is the ONE allowed home for the demoted --color-brand-* defs.
    if (!isTokenDefs && VIOLET_HEX.test(ln)) add(file, n, "hardcoded violet hex — use a counsel-* / globals.css token");
    if (!isTokenDefs && VIOLET_RGBA.test(ln)) add(file, n, "hardcoded violet rgba — use a counsel-* token");
    if (!isTokenDefs && APP_SURFACE.test(file) && BRAND_TOKEN.test(ln))
      add(file, n, "violet brand-* token in the logged-in app — use counsel-*");
    if (/legal advice/i.test(ln) && !ENFORCES_BAN.test(ln))
      add(file, n, "'legal advice' is banned in user-facing copy — use 'legal information/analysis'");
  });
}

walk(SRC);

if (violations.length) {
  console.error(`\n✗ token guardrail: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error("  " + v);
  console.error("");
  process.exit(1);
}
console.log("✓ token guardrail: clean (no violet tokens/hex, no banned phrase)");

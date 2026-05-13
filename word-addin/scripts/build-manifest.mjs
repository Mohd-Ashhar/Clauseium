// Build a concrete Office add-in manifest for one of three environments:
//   node scripts/build-manifest.mjs --env=dev|staging|prod
//
// Reads manifests/manifest.template.xml, substitutes {{KEY}} placeholders
// with env-specific values, writes manifests/manifest.${env}.xml. Each
// environment has its own GUID so all three can be sideloaded into the
// same Word install without colliding in Office's add-in catalog.
//
// Staging and prod origins are read from env vars so the same template
// works in CI without hardcoding production URLs. Dev values are
// hardcoded to localhost defaults.
//
// Fails non-zero if any {{KEY}} placeholder remains unresolved in the
// output. That guards against silently shipping a manifest with literal
// "{{ADDIN_ORIGIN}}" in it (which Office would reject anyway).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const TEMPLATE_PATH = join(ROOT, "manifests", "manifest.template.xml");

const ENVS = {
  dev: {
    guid: "8a3d2c1b-1f0a-4b6e-9c8d-d7e6a8b1c2d3",
    displayName: "Clauseium (dev)",
    addinOrigin: "https://localhost:3001",
    appOrigin: "http://localhost:3000",
  },
  staging: {
    guid: "8a3d2c1b-1f0a-4b6e-9c8d-d7e6a8b1c2d4",
    displayName: "Clauseium (staging)",
    addinOrigin:
      process.env.ADDIN_ORIGIN_STAGING ?? "https://addin-staging.clauseium.app",
    appOrigin:
      process.env.APP_ORIGIN_STAGING ?? "https://staging.clauseium.app",
  },
  prod: {
    guid: "8a3d2c1b-1f0a-4b6e-9c8d-d7e6a8b1c2d5",
    displayName: "Clauseium",
    addinOrigin: process.env.ADDIN_ORIGIN ?? "https://addin.clauseium.app",
    appOrigin: process.env.APP_ORIGIN ?? "https://clauseium.app",
  },
};

function parseEnvArg() {
  const arg = process.argv.find((a) => a.startsWith("--env="));
  if (!arg) {
    console.error(
      "[build-manifest] usage: node scripts/build-manifest.mjs --env=dev|staging|prod",
    );
    process.exit(2);
  }
  const value = arg.slice("--env=".length);
  if (!(value in ENVS)) {
    console.error(
      `[build-manifest] unknown env "${value}". valid: dev | staging | prod`,
    );
    process.exit(2);
  }
  return value;
}

function main() {
  const envName = parseEnvArg();
  const cfg = ENVS[envName];
  const template = readFileSync(TEMPLATE_PATH, "utf8");

  const substitutions = {
    MANIFEST_GUID: cfg.guid,
    DISPLAY_NAME: cfg.displayName,
    ADDIN_ORIGIN: cfg.addinOrigin,
    APP_ORIGIN: cfg.appOrigin,
  };

  let output = template;
  for (const [key, value] of Object.entries(substitutions)) {
    // Global replace via split/join. We avoid regex special-char surprises
    // because keys are simple {{ALL_CAPS}} tokens.
    output = output.split(`{{${key}}}`).join(value);
  }

  // Guard against typos / unsubstituted placeholders.
  const leftover = output.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover && leftover.length > 0) {
    console.error(
      `[build-manifest] unresolved placeholders in ${envName} manifest: ${[...new Set(leftover)].join(", ")}`,
    );
    process.exit(1);
  }

  const outPath = join(ROOT, "manifests", `manifest.${envName}.xml`);
  writeFileSync(outPath, output);
  console.log(
    `[build-manifest] wrote ${outPath.replace(ROOT + "/", "")} (guid=${cfg.guid}, addin=${cfg.addinOrigin}, app=${cfg.appOrigin})`,
  );
}

main();

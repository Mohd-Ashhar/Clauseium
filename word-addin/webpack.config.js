// Webpack config for the Clauseium Word add-in task pane.
//
// Two entry points:
//   - taskpane.tsx → taskpane.html (the React app rendered in Word's right pane)
//
// Dev server runs over HTTPS on :3001 with the office-addin-dev-certs cert
// so Word (Desktop + Online) can load it. Office requires HTTPS even for
// localhost; without the dev cert Office silently refuses to load the iframe.
//
// Env injection:
//   We load the workspace's root .env.local (where the Next.js app's
//   SUPABASE_URL / SUPABASE_ANON_KEY already live) and bake the four
//   add-in-public env vars into the bundle via webpack.DefinePlugin so
//   `process.env.X` reads in src/config.ts become string literals.

const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const devCerts = require("office-addin-dev-certs");

// Load env from the repo-root .env.local. Failing-quietly is fine; the
// fallbacks in src/config.ts cover dev. The Next.js app uses the same
// file, so add-in dev shares the same Supabase project automatically.
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

// Pick up the few values the add-in needs. The Next.js app exposes its
// Supabase config under NEXT_PUBLIC_*; alias them so add-in code can read
// the un-prefixed names.
const APP_ORIGIN =
  process.env.APP_ORIGIN ?? "http://localhost:3000";
const ADDIN_ORIGIN =
  process.env.ADDIN_ORIGIN ?? "https://localhost:3001";
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Build the task-pane CSP from the active environment's origins. This is injected
// into taskpane.html at build time (the static HTML must NOT hardcode localhost —
// webpack's DefinePlugin only touches the JS bundle, so a prod build would
// otherwise ship a dev CSP that blocks the prod API + OAuth origins). office.js
// is ALWAYS loaded from the Microsoft CDN (AppSource requirement — never self-host).
function buildCsp({ appOrigin, supabaseUrl, isDev }) {
  const connect = new Set(["'self'", appOrigin]);
  const frame = new Set([
    "'self'",
    appOrigin,
    "https://login.microsoftonline.com",
    "https://accounts.google.com",
  ]);
  if (supabaseUrl) {
    connect.add(supabaseUrl);
    frame.add(supabaseUrl);
  }
  if (isDev) {
    for (const o of ["http://localhost:3000", "https://localhost:3000"]) {
      connect.add(o);
      frame.add(o);
    }
  }
  return [
    "default-src 'self'",
    "script-src 'self' https://appsforoffice.microsoft.com",
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${[...connect].join(" ")}`,
    `frame-src ${[...frame].join(" ")}`,
    "img-src 'self' data: https:",
  ].join("; ");
}

module.exports = async (env, argv) => {
  const isDev = argv.mode !== "production";
  const csp = buildCsp({ appOrigin: APP_ORIGIN, supabaseUrl: SUPABASE_URL, isDev });

  return {
    devtool: isDev ? "source-map" : false,
    entry: {
      taskpane: "./src/taskpane/taskpane.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash].js",
      clean: true,
      publicPath: "/",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
        "@addin": path.resolve(__dirname, "src"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader", "postcss-loader"],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/taskpane/taskpane.html",
        filename: "taskpane.html",
        chunks: ["taskpane"],
        // Injected into the CSP <meta> in taskpane.html via `<%= htmlWebpackPlugin.options.csp %>`.
        csp,
      }),
      new CopyWebpackPlugin({
        patterns: [
          // Generated dev manifest at root of dist/ for sideloading.
          {
            from: "manifests/manifest.dev.xml",
            to: "manifest.xml",
            noErrorOnMissing: true,
          },
          // Icon PNGs the manifest references at https://<origin>/assets/icon-*.png.
          { from: "assets", to: "assets" },
        ],
      }),
      // Inject the four public values from process.env into the bundle.
      // JSON.stringify so each lands as a quoted string literal — webpack's
      // DefinePlugin performs textual substitution.
      new webpack.DefinePlugin({
        "process.env.APP_ORIGIN": JSON.stringify(APP_ORIGIN),
        "process.env.ADDIN_ORIGIN": JSON.stringify(ADDIN_ORIGIN),
        "process.env.SUPABASE_URL": JSON.stringify(SUPABASE_URL),
        "process.env.SUPABASE_ANON_KEY": JSON.stringify(SUPABASE_ANON_KEY),
      }),
    ],
    devServer: isDev
      ? {
          static: { directory: path.resolve(__dirname, "dist") },
          port: 3001,
          server: {
            type: "https",
            options: await devCerts.getHttpsServerOptions(),
          },
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          hot: true,
          // Serve taskpane.html for "/" and any client-route URL.
          // Word loads /taskpane.html directly (per the manifest), but the
          // fallback makes browser smoke-testing at https://localhost:3001/
          // work without manually appending the filename.
          historyApiFallback: {
            index: "/taskpane.html",
            rewrites: [{ from: /^\/$/, to: "/taskpane.html" }],
          },
        }
      : undefined,
  };
};

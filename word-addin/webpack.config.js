// Webpack config for the Clauseium Word add-in task pane.
//
// Two entry points:
//   - taskpane.tsx → taskpane.html (the React app rendered in Word's right pane)
//
// Dev server runs over HTTPS on :3001 with the office-addin-dev-certs cert
// so Word (Desktop + Online) can load it. Office requires HTTPS even for
// localhost; without the dev cert Office silently refuses to load the iframe.

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const devCerts = require("office-addin-dev-certs");

module.exports = async (env, argv) => {
  const isDev = argv.mode !== "production";

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
      }),
      new CopyWebpackPlugin({
        patterns: [
          // Copy the dev manifest into dist/ so dev/prod can be served identically
          {
            from: "manifests/manifest.dev.xml",
            to: "manifest.xml",
          },
        ],
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

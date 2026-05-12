// Ambient module declarations for non-TS assets resolved by webpack loaders.
// CSS imports go through postcss-loader + css-loader (or style-loader at
// runtime). Image imports go through asset/resource and resolve to a URL.

declare module "*.css";

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

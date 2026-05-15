import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  shims: true,
  // puppeteer is an optional lazy-install dep; keep it external so esbuild
  // doesn't try to bundle Chromium or its transitive deps (cosmiconfig etc.)
  external: ["puppeteer"],
});

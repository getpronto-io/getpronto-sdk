import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // adjust if your entry differs
  format: ["cjs"], // add 'esm' if you want ESM too
  dts: true, // emits dist/index.d.ts
  sourcemap: true,
  clean: true,
  platform: "node",
  target: "node18",
  // Important: do NOT mark the shared-config as external;
  // letting tsup bundle it is what removes the runtime dependency.
  external: [], // keep empty or only list true externals like 'fs'
});

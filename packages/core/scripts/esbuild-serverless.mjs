import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(here, "..");
const entry = path.join(pkgRoot, "src/index.ts");
const outfile = path.join(pkgRoot, "dist/serverless.cjs");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  logLevel: "info",
});

console.log("serverless bundle:", outfile);

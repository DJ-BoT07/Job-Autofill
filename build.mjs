// Bundles each entry point into a single classic script (MV3 content scripts
// cannot use ES module imports), then copies the static files into dist/.
import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

const options = {
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background/index.ts",
    popup: "src/popup/popup.ts",
    options: "src/options/options.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome114",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  logLevel: "info",
};

const staticFiles = [
  ["public/manifest.json", "dist/manifest.json"],
  ["public/icons", "dist/icons"],
  ["src/popup/popup.html", "dist/popup.html"],
  ["src/options/options.html", "dist/options.html"],
  ["src/shared/ui.css", "dist/ui.css"],
];
for (const [from, to] of staticFiles) cpSync(from, to, { recursive: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching for changes (re-run `npm run build` after editing HTML/CSS/manifest)…");
} else {
  await build(options);
}

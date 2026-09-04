/**
 * Renders every movement diagram to a contact sheet PNG so poses can be
 * checked by eye. Each diagram shows all of its key frames side by side
 * (static), then the animated version.
 *
 *   node scripts/preview-diagrams.mjs [mat|reformer|barre] [outDir]
 *
 * Needs playwright-core available (see the scratchpad pw folder in this
 * session, or `npm i -D playwright-core`) and a Chromium binary.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const discipline = process.argv[2] || "all";
const outDir = process.argv[3] || resolve(root, ".diagram-preview");
mkdirSync(outDir, { recursive: true });

// Compile only what this run needs, into a per-discipline folder, so three
// people can preview different disciplines at the same time. tsc still
// emits when it reports type errors, so its exit code is not fatal here.
const build = resolve(outDir, `build-${discipline}`);
const sources = discipline === "all" ? ["lib/diagrams/index.ts"] : [`lib/diagrams/${discipline}.ts`, "lib/diagrams/poseSvg.ts"];
try {
  execSync(
    `npx tsc ${sources.join(" ")} lib/seedMovements.ts --outDir ${build} --module commonjs --target es2020 --skipLibCheck --esModuleInterop`,
    { cwd: root, stdio: "inherit" },
  );
} catch {
  console.log("(tsc reported errors above; previewing what it emitted)");
}
const require = createRequire(import.meta.url);
const { diagramSvg, diagramCss } = require(resolve(build, "diagrams/poseSvg.js"));
const DIAGRAMS = discipline === "all"
  ? require(resolve(build, "diagrams/index.js")).DIAGRAMS
  : require(resolve(build, `diagrams/${discipline}.js`))[`${discipline.toUpperCase()}_DIAGRAMS`];
const { SEED_MOVEMENTS } = require(resolve(build, "seedMovements.js"));

const movements = SEED_MOVEMENTS.filter((m) => discipline === "all" || m.discipline === discipline);
const missing = movements.filter((m) => !DIAGRAMS[m.id]).map((m) => m.id);
const cards = movements
  .filter((m) => DIAGRAMS[m.id])
  .map((m) => {
    const d = DIAGRAMS[m.id];
    const frames = d.frames.map((f, i) => `<figure><div class="dg">${diagramSvg({ ...d, frames: [f] }, { animate: false })}</div><figcaption>frame ${i + 1}</figcaption></figure>`).join("");
    return `<section><h2>${m.name} <code>${m.id}</code></h2><div class="frames">${frames}<figure><div class="dg">${diagramSvg(d)}</div><figcaption>animated</figcaption></figure></div></section>`;
  })
  .join("");

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#DDFFE6;color:#14291F;font:13px system-ui,sans-serif}
section{margin-bottom:10px;border-bottom:1px solid #8FCFA2;padding-bottom:8px}
h2{font-size:13px;margin:0 0 4px}code{font-size:11px;color:#2F4A3C;font-weight:400}
.frames{display:flex;gap:10px}figure{margin:0;width:200px}.dg{background:#fff;border-radius:8px}
figcaption{font-size:11px;color:#2F4A3C;text-align:center}
${diagramCss({ ink: "#14291F", soft: "#C9F7D6", accent: "#C97A3A", muted: "#8FCFA2" })}
</style><body>${cards}${missing.length ? `<p><b>Missing (${missing.length}):</b> ${missing.join(", ")}</p>` : "<p>All movements have a diagram.</p>"}</body>`;
const htmlPath = resolve(outDir, `${discipline}.html`);
writeFileSync(htmlPath, html);

let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  try {
    ({ chromium } = require(process.env.PW_CORE || "/tmp/claude-0/-home-user-roodogs-coach/7e80375e-cf71-546b-b26b-dff26f272cc0/scratchpad/pw/node_modules/playwright-core"));
  } catch {
    console.log(`Wrote ${htmlPath} (playwright-core not found, skipping PNG). Missing: ${missing.length}`);
    process.exit(0);
  }
}
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
await page.goto("file://" + htmlPath);
// Split into pages of 12 movements so each PNG stays readable.
const sections = await page.locator("section").count();
const per = 12;
for (let i = 0; i < sections; i += per) {
  await page.evaluate(([from, n]) => {
    document.querySelectorAll("section").forEach((s, idx) => { s.style.display = idx >= from && idx < from + n ? "" : "none"; });
    window.scrollTo(0, 0);
  }, [i, per]);
  const file = resolve(outDir, `${discipline}-${String(i / per + 1).padStart(2, "0")}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}
await browser.close();
console.log(`${movements.length - missing.length}/${movements.length} ${discipline} movements have diagrams. Missing: ${missing.join(", ") || "none"}`);

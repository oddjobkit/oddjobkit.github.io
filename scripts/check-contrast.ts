#!/usr/bin/env bun
// Contrast gate for assets/site.css. Parses the light tokens in :root and the dark overrides in the
// prefers-color-scheme block, then checks every text/surface pair the stylesheet draws in both
// schemes (WCAG 2.x: 4.5:1 text, 3:1 for focus rings and the marker's boundary). Translucent tokens
// are composited over the page the way a browser paints them. Exits 1 on a miss.
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Rgb = [number, number, number];
type Color = { rgb: Rgb; alpha: number };
const css = readFileSync(join(import.meta.dir, "..", "assets", "site.css"), "utf8");

function parseOklch(text: string): { l: number; c: number; h: number; alpha: number } {
  const m = text.trim().match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
  if (!m) throw new Error(`not an oklch() color: ${text}`);
  return { l: +m[1]!, c: +m[2]!, h: +m[3]!, alpha: m[4] ? +m[4] : 1 };
}
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const enc = (v: number) => Math.round(clamp(v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
function toColor(text: string): Color {
  const { l, c, h, alpha } = parseOklch(text);
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S, -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S];
  return { rgb: lin.map(enc) as Rgb, alpha };
}
const over = (top: Color, under: Color): Rgb => top.rgb.map((v, i) => Math.round(top.alpha * v + (1 - top.alpha) * under.rgb[i]!)) as Rgb;
function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a: Rgb, b: Rgb) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(oklch\([^)]*\))\s*;/g)) out[m[1]!] = m[2]!;
  return out;
}
const light = tokens(css.slice(css.indexOf(":root"), css.indexOf("@media")));
const dm = css.indexOf("@media (prefers-color-scheme: dark)");
const darkOverrides = tokens(css.slice(dm, css.indexOf("@media", dm + 10)));
const schemes: Record<string, Record<string, string>> = { light, dark: { ...light, ...darkOverrides } };

// fg token on bg token, minimum ratio, what it styles in assets/site.css
const PAIRS: [string, string, number, string][] = [
  ["text", "page", 4.5, "body text"],
  ["text", "raised", 4.5, "rows, pills"],
  ["text", "sunken", 4.5, "code, badges"],
  ["text", "selection", 4.5, "selected text"],
  ["muted", "page", 4.5, "meta, breadcrumb, footer, labels"],
  ["muted", "raised", 4.5, "meta and permission line inside rows"],
  ["muted", "sunken", 4.5, "muted text on a sunken tone"],
  ["ink", "page", 4.5, "links, header, nav"],
  ["ink", "raised", 4.5, "links inside rows"],
  ["on-ink", "ink", 4.5, "store button, skip link"],
  ["on-ink", "ink-hover", 4.5, "store button hover"],
  ["ink", "page", 3, "focus ring on the page"],
  ["ink", "raised", 3, "focus ring inside rows"],
  ["ink", "sunken", 3, "focus ring on sunken tone"],
  ["marker-edge", "page", 3, "marker dot boundary"],
  ["marker-edge", "raised", 3, "marker dot boundary"],
];

let failed = 0;
for (const [scheme, t] of Object.entries(schemes)) {
  for (const [fg, bg, min, use] of PAIRS) {
    if (!t[fg] || !t[bg]) throw new Error(`missing token ${!t[fg] ? fg : bg} in ${scheme}`);
    const page = toColor(t["page"]!);
    const bgRgb = over(toColor(t[bg]!), page);
    const fgRgb = over(toColor(t[fg]!), { rgb: bgRgb, alpha: 1 });
    const r = ratio(fgRgb, bgRgb);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "pass" : "FAIL"}  ${scheme.padEnd(5)} ${fg} on ${bg}`.padEnd(40) + `${r.toFixed(2)}:1 (need ${min})  ${use}`);
  }
}
if (failed) { console.error(`\n${failed} pair(s) below the minimum`); process.exit(1); }
console.log("\nall pairs pass");

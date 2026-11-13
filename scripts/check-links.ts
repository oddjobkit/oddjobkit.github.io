#!/usr/bin/env bun
// Crawls the site from / on a local static server and fails if any internal link, stylesheet, image
// or #fragment target does not resolve. External links and mailto: are not fetched.
import { serve } from "./serve.ts";

const server = serve(0);
const base = `http://localhost:${server.port}`;
const seen = new Map<string, string>(); // path -> html (or "" for non-html)
const queue = ["/", "/sitemap.xml", "/robots.txt", "/favicon.svg"];
const bad: string[] = [];
const refs: { from: string; to: string }[] = [];

while (queue.length) {
  const path = queue.shift()!;
  if (seen.has(path)) continue;
  const res = await fetch(base + path, { redirect: "follow" });
  if (!res.ok) { bad.push(`${path} -> ${res.status}`); seen.set(path, ""); continue; }
  const type = res.headers.get("content-type") ?? "";
  const body = type.includes("text/html") || type.includes("xml") ? await res.text() : "";
  seen.set(path, body);
  if (type.includes("xml") && path === "/sitemap.xml") {
    for (const m of body.matchAll(/<loc>https:\/\/oddjobkit\.com([^<]*)<\/loc>/g)) queue.push(m[1]!);
  }
  if (!type.includes("text/html")) continue;
  for (const m of body.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1]!;
    if (/^(https?:|mailto:|tel:|data:)/.test(raw)) continue;
    const url = new URL(raw, base + path);
    queue.push(url.pathname);
    refs.push({ from: path, to: url.pathname + url.hash });
  }
}
for (const { from, to } of refs) {
  const [p, hash] = to.split("#");
  if (!hash) continue;
  const html = seen.get(p!) ?? "";
  if (!new RegExp(`\\sid="${hash}"`).test(html)) bad.push(`${from} -> ${to} (no id="${hash}")`);
}
server.stop();
console.log(`${seen.size} URLs fetched, ${refs.length} internal references checked`);
if (bad.length) { console.error("BROKEN:\n" + bad.join("\n")); process.exit(1); }
console.log("every internal link resolves");

#!/usr/bin/env bun
// Static server that behaves like GitHub Pages for this site: /dir/ serves dir/index.html, and a
// directory requested without the trailing slash redirects to it. Used for previews and by check-links.ts.
//   bun scripts/serve.ts [port]
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain" };

export function serve(port = 0) {
  return Bun.serve({
    port,
    fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const file = normalize(join(ROOT, path));
      if (!file.startsWith(ROOT) || file.includes("/.git")) return new Response("not found", { status: 404 });
      if (existsSync(file) && statSync(file).isDirectory()) {
        if (!path.endsWith("/")) return new Response(null, { status: 301, headers: { location: path + "/" } });
        const index = join(file, "index.html");
        return existsSync(index) ? new Response(Bun.file(index), { headers: { "content-type": TYPES[".html"]! } }) : new Response("not found", { status: 404 });
      }
      if (!existsSync(file)) return new Response("not found", { status: 404 });
      return new Response(Bun.file(file), { headers: { "content-type": TYPES[extname(file)] ?? "application/octet-stream" } });
    },
  });
}

if (import.meta.main) {
  const s = serve(Number(process.argv[2] ?? 4173));
  console.log(`http://localhost:${s.port}/`);
}

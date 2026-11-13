# oddjobkit.github.io

The oddjobkit.com site, served by GitHub Pages from `main`. `index.html` is hand-written. Everything else below is generated.

## Regenerating the tool pages

The tool pages come from each tool repo's `CHROMEWEBSTORE.md` (`../repos/<tool>/`). After a tool's listing or privacy text changes:

```
bun scripts/build-pages.ts && bun scripts/check-contrast.ts && bun scripts/check-links.ts
```

`build-pages.ts` (Bun, no dependencies; `--repos <dir>` points elsewhere, `--dry` writes nothing) overwrites only:
`privacy/<tool>/index.html`, `privacy/index.html`, `tools/index.html`, `assets/icons/<tool>.png` (from `repos/ui/icons/out/<tool>/icon-128.png`) and `sitemap.xml`. It prints each tool's version, status and any parse warning. It never edits `index.html` except to add the Tools and Privacy footer links once. `assets/site.css` is hand-written; `check-contrast.ts` gates its colour tokens (WCAG, both schemes) and `check-links.ts` crawls the site on a local server (`bun scripts/serve.ts` previews it at http://localhost:4173/).

Constants at the top of `build-pages.ts`: `FOCUS` (tools listed as "First release soon"; every other tool is "Not yet released"), `PUBLIC_REPOS` (add a tool when its GitHub repo goes public; until then the source line says "available at release"), `NOT_TOOLS`.

### Keeping CHROMEWEBSTORE.md parseable

- **Name, short description, single purpose**: the first non-blank line after `**Extension Name**`, `**Short Description**` and `**Single Purpose**` (a line starting with `(` is skipped as a note). One line each.
- **Permissions**: a table under an `## Permissions Justification` heading with columns `Permission | Type | Justification`. Put names in backticks. `Type` is `permissions`, `optional_permissions`, `host_permissions` or `optional_host_permissions`. A tool with none has one row, `(none)`.
- **What leaves your device**: the first of these that exists: a `### Data-use sentence` (or `statement`) heading, a `**Data-use statement:**` label, the answer on the `**Does the extension collect user data?**` line when it is a sentence, or the paragraph right under that line. The "Nothing leaves your device." line shows only when every row of the `Data Type | Collected? | Transmitted Off-Device? ...` table says `No` in the transmitted column.
- **Privacy policy text**: the first `>` blockquote or fenced block under a `### Privacy-policy text` heading, else under `## Privacy Policy`. One paragraph per line. A first line ending in "privacy" or "privacy policy" is dropped as a title; `Contact: ...` is dropped (the page has its own). Paragraphs that start with `What it stores`, `Where it keeps it` and similar, or that say stored, storage, keeps or kept (not the first paragraph), go under "What is stored"; the rest go under "More detail". A `Label: text` start renders with a bold label.
- **Effective date**: `> Last Updated: YYYY-MM-DD` in the first 12 lines (today if missing). **Version**: `public/manifest.json`, else a `Version: x.y.z` header line, else the last row of the Version History table.
- **Store link**: when `Item ID:` (header line or the line under `**Item ID**`) holds a 32-letter ID (a to p), the tools page links `chromewebstore.google.com/detail/<id>`; until then it shows a marked placeholder.

# vCard ⇄ CSV Studio

An offline contact toolkit: convert between **vCard (VCF)** and **CSV**, and merge &
deduplicate contact lists — entirely in the browser. No uploads, no tracking, no build step.

## Pages

| Page | File | What it does |
|---|---|---|
| Convert | `index.html` | Paste, drop or choose a vCard/CSV file, preview and edit contacts in a table, convert either direction, copy or download the result. |
| Compare vCards | `compare-vcf.html` | Load up to 4 vCard sources (2 shown by default, "Add input" for more), auto-merge duplicates (same name or phone), resolve conflicts, edit inline, export one merged VCF. |
| Compare CSVs | `compare-csv.html` | Same workflow for CSV sources, with per-phone row options, exporting one merged CSV. |

See also: `AGENTS.md` (guide for agents working on this codebase) and
`FUTURE-PLANS.md` (roadmap: proposed, accepted, declined ideas).

## Features

- vCard 3.0 parsing: multiple TEL/EMAIL lines, FN/N fallbacks, folded lines, escaped
  characters, quoted-printable values; CSV in the `"Name,=""PHONE"""` spreadsheet style,
  plain two-column CSV/TSV, and header rows.
- Editable contacts table: inline rename, phone pills (edit / remove / add), full vCard
  field editor, duplicate and conflict filters, search, pagination.
- Live regeneration of the output from the edited list; copy to clipboard or download.
- Drag & drop with an overwrite guard (never clobbers existing data without a confirm).
- Dark / light theme with system-preference default, persisted in `localStorage`.

## Run

Pure static files — no dependencies, no build. Open `index.html` directly in a browser,
or serve the folder with any static server, e.g.:

```
python -m http.server 8000
# or
npx serve .
```

> Some browsers restrict module-less `file://` pages less than ES modules; all current
> features work from `file://`, but serving over HTTP is the faithful way to test.

## Publish

Copy the folder as-is to any static host (GitHub Pages, Netlify, Cloudflare Pages, …).
There is nothing to build: the three HTML pages plus `assets/` are the whole site.

**Hosting:** GitHub Pages — repo `drizzer/contacts-studio`, live at
`https://drizzer.github.io/contacts-studio/`. `.nojekyll` is included so GitHub
skips Jekyll processing. All paths are relative, so the project-page subpath
works unchanged.

## Privacy

All parsing and conversion happens locally in your browser. Files are never uploaded;
the page makes no network requests.

## Testing

- Syntax: `node --check` takes one file at a time — run it once per file:
  `node --check assets/lib.js`, then `assets/ui.js`, then `assets/compare.js`.
- Logic: **there is no committed regression suite yet.** `AGENTS.md` "How to verify"
  describes the checks to make and the fixtures to make them against; they become
  `tests/test.js`, run with `node tests/test.js`, in v1.1 P0. Until then a change to
  `assets/lib.js` is verified by writing a throwaway script that requires it and asserts
  those same cases — and that throwaway script is precisely what v1.1 P0 commits.
- UI: open each page in a browser; every table interaction (inline edits, pills,
  selection, filters, pagination, modals) is scriptable via devtools/automation.

## Layout

```
index.html          Convert page
compare-vcf.html    Compare vCards page
compare-csv.html    Compare CSVs page
AGENTS.md           guide for AI agents working on this codebase
FUTURE-PLANS.md     roadmap (proposed / accepted / declined ideas)
LICENSE-THIRD-PARTY.md  register of vendored assets and their licence notices
docs/DECISIONS.md   decision records: why the site and tool are shaped this way
docs/LEGAL.md       what the comparison and legal pages may claim, and the sources
docs/KANBAN.md      GitHub Projects board setup and sync rules
assets/style.css    shared styles (light + dark themes)
assets/lib.js       parsing / conversion core (VCFStudio namespace)
assets/ui.js        shared contacts table (selection, inline edits, pagination)
assets/compare.js   compare-pages controller
assets/favicon.svg  favicon
assets/og.png       1200×630 Open Graph image
```

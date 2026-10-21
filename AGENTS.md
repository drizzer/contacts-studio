# AGENTS.md — vCard ⇄ CSV Studio

Guidance for AI agents (or humans) picking this project up in a fresh session.
Read this before changing anything; it documents invariants that are easy to break
and hard to rediscover. The feature roadmap lives in `FUTURE-PLANS.md`: a versioned
release calendar (semver minors, one theme per release) with per-release priorities,
exit criteria and a release checklist at the end. Check it before proposing ideas, and
update it when scope changes.

Three supporting documents sit in `docs/`: `DECISIONS.md` (why the site and the tool are
shaped the way they are, with the rejected alternatives), `LEGAL.md` (what the public pages
may claim, with the legal sources) and `KANBAN.md` (how the GitHub Projects board is built
and when it syncs). Read the matching one before changing a decision it records — they are
append-only records, not scratch notes.

## What this is

A dependency-free, build-free, pure-static contact toolkit. Three HTML pages share
three JS assets. Everything runs client-side; the site must keep working when opened
via `file://` **and** from any static host. **Never add a build step, framework,
package manager, or network call** — that is a project constraint, not a preference.

## Architecture

```
assets/lib.js      VCFStudio namespace (window.VCFStudio / module.exports).
                   Pure logic, NO DOM access: parsing (vCard 3.0 + CSV), writers
                   (contactsToCSV / contactsToVCF), merge/dedupe (dedupeContacts,
                   mergeContacts), makeContact (id, name, nParts, phones, emails,
                   extras, schema, raw, source), SCHEMA_KEYS.
assets/ui.js       ContactTable class (window.ContactTable) + toast(). Owns the
                   contacts <table>: filtering/sorting, selection, pagination,
                   inline rename, phone pills, dup conflict map, full vCard modal
                   editor. Fires opts.onChange() after every data mutation.
assets/compare.js  initCompare({format:'vcf'|'csv', samples:[...]}). Owns the
                   source slots (2 visible of MAX 4), auto-merge toggle, rebuild,
                   final-output textarea + copy/download.
index.html         Convert page: owns its own parse→table→convert wiring, opts
                   (per-phone, merge), input/output textareas, drop guard.
compare-*.html     Thin pages: markup + initCompare() + sample data only.
```
Data flows one way: **sources → ContactTable.contacts → writers → output textarea**.
Table edits mutate `contacts` in place (by `id`), then `onChange` regenerates output.
Never write output from the slot layer directly.

## Contact model (lib.js makeContact)

```
{ id, name, nParts (vCard N array|null), phones[], emails[],
  extras[{key,value}] (free-form, unknown props),
  schema{} (known vCard 3.0 props from SCHEMA_KEYS),
  raw (original text, for the expandable detail row), source (file/slot label) }
```

`schema` is authoritative for SCHEMA_KEYS (NICKNAME, BDAY, TITLE, ROLE, ORG, URL,
TZ, GEO, NOTE, CATEGORIES, ADR, SORT-STRING, AGENT, MAILER, CLASS). The editor
modal moves those keys out of `extras` into `schema` on save. `contactsToVCF` emits
schema props; `contactsToCSV` cannot (one name+phone per row) — the UI must keep
warning about that omission instead of dropping it silently.
## Invariants & known traps (learned the hard way)

1. **Escaped-entity editor trap.** The file editor used in some agent harnesses
   decodes HTML entities in old/new text. Editing lines containing `&` or
   `&#8646;` via the file editor can silently rewrite them. For such lines use a
   PowerShell script with explicit string pieces (e.g. `$amp = '&' + 'amp;'`),
   verify with Select-String afterwards, and never trust a first-try match.
2. **Esc-cancel / focusout race.** `render()` replaces `tbody.innerHTML`, which
   destroys a focused inline input and fires `focusout`. Cancel paths must call
   `this._renderCanceling()` (sets `_canceling`); `_commitPill` and `_commitName`
   check it. `_commitPill` also has `_committing` because Enter + focusout both
   fire. Do not remove these guards — removal reintroduces a draft-leak bug.
3. **Row-click expansion** must ignore clicks on `input/button/label/select/.pill`
   (checkbox clicks used to toggle the detail row). Edit/Del buttons are checked
   BEFORE that guard.
4. **Textarea CRLF.** Browsers normalize `\r\n` to `\n` when reading
   `textarea.value`. Canonical writer output is kept in `state.outText` (index) /
   `outText` (compare) and `canonicalOut()` returns it for copy/download so
   downloaded files keep CRLF.
5. **Pagination + per-page.** `totalPages(true)` ignores filters (used after
   delete/setContacts to clamp `page`); `totalPages()` respects them.
6. **Duplicate semantics.** `dupMapFor` flags pairs where same name + DIFFERENT
   numbers ('name') or same number + DIFFERENT names ('phone'). Pairs matching on
   both are true duplicates: auto-merge's job, not the filter's.
7. **CSV per-phone omission** is by format design (strictly one phone per row).
   `contactsToCSV` keeps only the first phone when the option is off; the outStats
   line must show "N numbers omitted" (compare.js renderOutput / index convert()).
8. **MAX = 4, visible starts at 2** in compare.js. If you change MAX, update the
   "up to N inputs" badge in both compare pages, README, and meta descriptions.
9. **Column-width breakpoints**: `.grid` stacks under 920px; `.slots.cols3/4`
   collapse to 2 cols under 1100px, 1 col under 700px; the Input header hides its
   filename hint at 921-1023px so input/output textareas stay level (cardhead
   `min-height:40px` is what aligns them).
10. **Theme**: `data-theme="dark"|"light"` on <html>, set pre-CSS by an inline head
    script (avoids flash), persisted in localStorage key `vcfconv-theme`. Three
    token blocks exist: light `:root`, `html[data-theme=dark]`, and the
    `@media (prefers-color-scheme: dark)` mirror; keep all three in sync.
    Filled buttons use `--accent-fill` (not `--accent`) for WCAG contrast in dark.
11. **`og:image` is relative** on purpose until the publish domain exists (scrapers
    want absolute; see README Publish).
12. **`name` attributes on slot textareas** silence a DevTools a11y advisory; keep
    them when regenerating slots.
13. **No external SVG sprite.** `<use href="assets/icons.svg#id">` is a cross-document
    reference that browsers treat as a CORS-governed fetch, and Chrome blocks it from
    `file://` — the icons disappear in the exact mode this project tests first. Inline the
    `<symbol>` block into each page and reference `<use href="#id">`. Same reason a runtime
    `fetch()` of the sprite is not an option: a local fetch is still a network-layer request.
    Rationale: `docs/DECISIONS.md` D-002.
14. **Icons and tokens are governed, not improvised.** New icons come from the vendored
    Lucide subset and are registered in `LICENSE-THIRD-PARTY.md`; CSS variables follow the
    alias block in D-003, where shadcn's `--accent` means *hover surface*, not the brand teal
    (`--primary` here). Renaming tokens across all three theme blocks is a visual change and
    needs a before/after screenshot of every page in both themes.

## How to verify (do after any change)

```powershell
# 1. syntax (each file)
node --check assets/lib.js   # repeat for ui.js, compare.js
```

Then a logic regression: write a temp Node script that requires `assets/lib.js`
(its `module.exports` is the same API) and asserts:
- `parseVCF` on a multi-card fixture (names, multi-TEL, unicode, schema capture)
- `contactsToCSV` exact lines: `"Name,=""PHONE"""` (doubled quotes)
- `parseCSV` + `rowsToContacts` on that fixture gives contacts back
- `contactsToVCF` emits `N:;Name;;;` for single-word names + schema props
- round-trips in both directions are lossless for name + phones
- `mergeContacts`/`dedupeContacts` keep schema and merge by name OR normalized phone

Fixtures live in `index.html` (SAMPLE_VCF / SAMPLE_CSV) and the compare pages
(SAMPLE_A / SAMPLE_B). Keep them generic (no real personal data).
UI verification: serve the folder (`python -m http.server 8000`) or open `file://`
URLs, then drive each page in a browser:
- index: load both samples; convert both directions; inline rename; pill
  edit/add/remove (Enter, blur, AND Esc paths); a checkbox click must NOT expand
  the row; pagination with more rows than per-page; dup filters toggle; the
  drop-overwrite guard confirms before replacing.
- compare-*: samples then auto-merge count message; "Add input" grows 2, 3, 4
  columns and disables; dup filters; manual Merge selected; the final output
  tracks every table edit; drop into a filled slot confirms, empty slot does not.

Check the console: expect ZERO errors. (A one-off "Unsafe attempt to load URL"
on the very first `file://` load in some automation setups is a browser artifact,
not an app bug; a reload clears it.)

## UI conventions

- Design tokens are CSS custom properties in `assets/style.css`; never hard-code
  colors in components; add a token in all three theme blocks.
- UI copy in English; keep it plain (avoid punctuation-heavy copy: the impeccable
  detector flags em-dash overuse in body text).
- No layout shift: textareas keep fixed min-heights; the table scrolls internally
  (`.tablewrap`).
- `toast()` (ui.js) for transient feedback; `#msg`/`#cmpMsg` boxes for
  parse/export notes.
- Row controls are real buttons with `title` and `aria-label`.

## Publishing checklist

1. Any static host; no build step.
2. Replace the relative `og:image` with the absolute URL (three `<head>`s).
3. GitHub Pages only: add an empty `.nojekyll` at the root.
4. Optional: verify the OG preview in the platform's sharing debugger after deploy.






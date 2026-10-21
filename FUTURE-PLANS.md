# FUTURE-PLANS.md — Roadmap

Feature calendar for vCard ⇄ CSV Studio: what ships next, in which version, and why.
Read together with `README.md` and `AGENTS.md`. Re-cut 2026-10: the old priority
buckets (quick wins / medium / bigger bets) are replaced by a versioned calendar, with
competitor and library research folded into it.

Rules of this file:

- Every open idea belongs to exactly **one** release. An idea with no version is not
  planned yet.
- When an item is done, tick it, add the date and commit hash, and move it to **Done**.
- When an item is declined, move it to **Declined** with the reason. Never silently
  delete it.

## Ground rules (apply to every idea here)

- Pure static: no build step, no framework, no package manager, no network calls.
- Must keep working when opened via `file://` and from any static host.
- All parsing/conversion stays client-side; nothing is ever uploaded.
- Generic sample data only (no real personal data in fixtures).
- No release may break a documented `v1.0.0` behaviour: the parse formats, the CSV
  `"Name,=""PHONE"""` shape, schema passthrough, and `file://` support.

## Release cadence (decided 2026-10)

- One **minor** per themed release: `v1.1` → `v1.2` → `v1.3` → `v1.4` → `v1.5` → `v2.0`.
- **Patch** (`v1.1.1`): fixes only, never new UI surface.
- **Minor**: the features listed under that release. Each one is shippable and tested,
  so the app is fully usable at every tag, not only at the end of the series.
- **Major** (`v2.0`): the Scale theme, a runtime architecture change (worker parsing,
  virtualization, asset-backed metadata). No file-format break is planned for it.
- Version numbers are a sequence, not a calendar promise. No dates until a release is cut.
- Every release ends the same way: tag, release notes, README/AGENTS sync, roadmap
  update, live check (see **Release checklist**).

Theme ladder:

| Version | Theme | One-line goal |
|---|---|---|
| `v1.0.0` | Baseline (shipped) | Convert and compare, offline, zero dependencies |
| `v1.1` | Foundation | The files people actually have, parsed correctly; edits that can be undone |
| `v1.2` | Dialects | Real-world CSV exports in, vCard 2.1 and 4.0 dialects understood |
| `v1.3` | Merge intelligence | Decide *which value* survives, not just *which contact* |
| `v1.4` | Output reach | Get the result out: per-contact files, XLSX, QR, device presets |
| `v1.5` | Surface & trust | A front door, honest legal pages, and a comparison a reader can verify |
| `v2.0` | Scale | Big files stay fast; photos; i18n; framework decision if the trigger fires |

## Status

- `[ ]` proposed, not started
- `[~]` in progress
- `[x]` done (move to **Done** with date and commit)

Priorities inside a release: **P0** do first, **P1** same release, **P2** only if time
allows. A release does not ship with an open P0.

## v1.1 — Foundation

Goal: make the input side trustworthy and the editing side recoverable. Nothing here is
new surface area: it is the difference between "works on the samples" and "works on the
file the user actually has".

### P0

- [ ] **Committed test suite**: `tests/test.js`, run with `node tests/test.js`. Turn the
      regression checks in `AGENTS.md` "How to verify" into a real committed suite:
      `parseVCF` on a multi-card fixture (names, multi-TEL, unicode, schema capture),
      `contactsToCSV` exact lines (`"Name,=""PHONE"""`), `parseCSV` + `rowsToContacts`
      round-trip, `contactsToVCF` `N:;Name;;;` plus schema emission, lossless round-trips
      both ways, and `mergeContacts`/`dedupeContacts` keeping schema and matching by name
      OR normalized phone. ~1-2h. Everything below depends on this net.
- [ ] **Encoding detection (BOM sniffing)**: read files as `ArrayBuffer`, sniff the BOM
      (UTF-8, UTF-16LE, UTF-16BE) and decode with `TextDecoder`. Outlook exports are
      frequently UTF-16 and currently garble because everything is read as UTF-8. The
      main competitor lists encoding as a headline FAQ item, which confirms this is a
      user blocker rather than an edge case. Also strip a stray U+FEFF mid-file. ~30 min.
      Done when: UTF-16LE CSV and UTF-16BE VCF both round-trip, UTF-8 with BOM loses the
      BOM, and a CP1252 file never turns accents into replacement characters.
- [ ] **Export the filtered or selected view**: "download what you see". Feed
      `table.filtered()` or the selection to the writers instead of the whole list. Tiny,
      but it turns the table from a preview into a working tool for large lists.

### P1

- [ ] **Undo / redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)**: snapshot stack of the contacts array
      on every mutation (edits, deletes, merges, imports). Show the entry in the
      selection bar and disable it when empty. Cap the stack (about 50) so a long session
      does not grow without bound. Undo must restore exactly the previously rendered
      state, including selection counts.
- [ ] **Session autosave**: autosave sources and edited contacts to `localStorage`
      (IndexedDB only if size forces it); on load, offer "Restore previous session?".
      Still 100% local. Protects long merge sessions from an accidental tab close. Must
      degrade silently when storage is full or blocked (private mode, `file://` quota).

### P2

- [ ] **Version stamp**: a small `v1.x.y` in the footer, so a deployed page can be
      identified without opening the repo. Cheap, and it makes "is the live site
      current?" answerable at a glance.
- [ ] **Icon system (Lucide subset, inlined)**: replace the entity glyphs (`&#8646;`,
      `&#128193;`, `&#9681;`) with a vendored Lucide subset inlined as `<symbol>` blocks in a
      hidden `<svg>` on each page. Entities render differently on every platform and cannot
      take a colour or a size from CSS. Do this in v1.1, not later: v1.2's dialect UI and
      v1.3's merge dialogs both need a real icon vocabulary, and building them on entities
      means doing this work twice. Full rationale and the rejected external-sprite approach:
      `docs/DECISIONS.md` D-002. Costs a licence notice, which is why the next item is a
      dependency of this one. ~2h.
- [ ] **shadcn/ui token aliases**: add a compatibility block in `assets/style.css` mapping
      shadcn's variable names (`--background`, `--card`, `--primary`, `--ring`,
      `--destructive`, …) onto the tokens that already exist, so theme packs become
      droppable later without a rewrite. Zero visual change — prove it with a before/after
      screenshot of all three pages in both themes. Watch the `--accent` collision
      (brand teal here, hover surface in shadcn): `docs/DECISIONS.md` D-003. ~45 min.

### v1.1 exit criteria

- `node tests/test.js` passes and is committed.
- UTF-16 and BOM-carrying UTF-8 files load through both the file picker and drag & drop.
- Undo/redo covers every mutation path in `ui.js` and `compare.js`.
- Icons render on all three pages from `file://` with zero network requests, and each page's
  inline sprite block is identical — a drift check, not a visual one.
- Zero console errors on all three pages, from `file://` and over HTTP.

## v1.2 — Dialects

Goal: accept the files that exist in the world, not the ones the spec suggests.

### P0

- [ ] **Real-world CSV dialect presets**: Google Contacts, Outlook.com and iCloud each
      export a different column layout. Per-dialect mapping tables plus a detection
      preview ("Detected Google Contacts export: Name → FN, Phone 1 → TEL …"), with a
      manual override. These are the three exports people actually have. Detection must
      stay conservative: when unsure, show the mapping UI instead of guessing.
- [ ] **vCard 2.1 read**: 2.1 is still emitted by older Outlooks and phone exports, with
      `TEL;CELL:` style types, bare `CHARSET=` parameters, quoted-printable and base64
      values, and `N` values without semicolon padding. Read-only support; keep writing
      3.0 by default.

### P1

- [ ] **vCard 4.0 read/write (RFC 6350)**: URI values (`TEL;TYPE=cell:tel:+49…`,
      `EMAIL:mailto:…`), `VERSION:4.0`, and the kind/member properties. Pragmatic scope:
      parse 4.0 into the same contact model and offer 3.0 or 4.0 on export, never
      silently downgrade. Keep 3.0 as the default writer until device testing says
      otherwise.
- [ ] **Export encoding choice**: pair the v1.1 reader with a writer option for UTF-8
      (default, no BOM) and UTF-8 with BOM or UTF-16LE for legacy Windows importers. Only
      offer encodings we can produce exactly, and state the default in the UI.

### P2

- [ ] **CSV delimiter and quoting controls**: semicolon (common in `de-DE` and `fr-FR`
      Excel locales), tab, comma, plus always-quote versus minimal quoting. Detected by
      default, overridable.

### v1.2 exit criteria

- Each of the three dialect fixtures imports into the correct columns with a visible
  mapping summary, and a mismatched file never silently yields empty names.
- A vCard 2.1 fixture with quoted-printable and base64 values parses.
- A 4.0 fixture parses and can be exported as both 3.0 and 4.0.

## v1.3 — Merge intelligence

Goal: the compare pages promise "resolve conflicts" but merge per contact,
all-or-nothing. This release makes the promise true. It is the highest-value gap found in
the competitor review: the paid desktop tools merge whole files, but none of them offer
field-level choice in a browser with no upload.

### P0

- [ ] **Field-by-field merge dialog**: a side-by-side diff per contact to pick which
      phone, email, address and name survives from which source, keep-both for list
      fields, and a "same for all remaining conflicts" shortcut. Show the count of
      unresolved conflicts before export is allowed. This is the feature that justifies
      the compare pages existing. Expect DOM-sync pressure here: if the guards in `ui.js`
      grow again, the Svelte trigger under **Decisions** may fire. Commit the v1.1 tests
      first.
- [ ] **Fuzzy duplicate detection (E.164 plus name folding)**: replace the naive
      `normPhone` (`[^\d+]` strip) with country-aware matching, so `+49 (0) 30 1234` and
      `+49301234` match. Add name casefolding and accent stripping, plus an optional
      edit-distance pass. Present results as confidence, never as silent auto-merge:
      "certain" (identical normalized number), "probable" (name plus last 9 digits),
      "possible" (near-name only).
- [ ] **Vendored `libphonenumber-js` metadata for E.164**: ships as a lazy local asset
      loaded only when strict phone matching is on, with a heuristic fallback if it is
      missing. Mechanics and rationale: see **Decisions**.

### P1

- [ ] **Merge preview with an audit trail**: before writing the file, show what will be
      written (N contacts, X merged, Y phones kept, Z fields dropped) and export a small
      `merge-report.txt` listing the decisions, so the result can be explained later. CRM
      dedupe flows (HighLevel, Business Central, CiviCRM) all put review before commit;
      that is the part worth copying.
- [ ] **Per-source priority order**: drag sources into a preference order that seeds the
      merge dialog defaults and decides automated picks.

### P2

- [ ] **Duplicate group navigation**: jump between conflict groups instead of scrolling,
      with keyboard next/previous and a "1 of 12" counter.

### v1.3 exit criteria

- No contact is merged without the user seeing which values were dropped, unless
  auto-merge is explicitly on and the match is "certain".
- `+49 (0) 30…` matches `+4930…`; two different people sharing a name but no phone do not
  auto-merge.
- The merge report is readable without the tool.

## v1.4 — Output reach

Goal: getting the result out of the browser and into the thing that consumes it.

### P0

- [ ] **Split a merged VCF into one file per contact (ZIP)**: "export 4 contacts, get 4
      files". A store-only ZIP writer is about 150 lines of vanilla JS (CRC-32 plus local
      headers), no dependency. It pairs directly with the compare pages and is the shape
      phones want when they import one card per file. Free here, paid in the desktop
      tools.
- [ ] **Device export presets**: writer profiles for the targets people actually use:
      iOS (3.0, one card per file, `item1.TEL` grouping tolerated), Android (single
      multi-card `.vcf`), legacy Outlook (2.1 plus `CHARSET=`), and the Huawei / Xiaomi /
      WeChat quirks (line-folding width, `X-` properties, group prefixes). A preset
      changes writer behaviour only; the contact model stays identical, and each preset
      states what it changes.

### P1

- [ ] **XLSX export**: a minimal `.xlsx` is ZIP plus a few XML parts, so the store-only
      writer above makes it feasible with no dependency. One sheet, header row, one row
      per phone to match the CSV model, no styling.
- [ ] **QR code per contact**: a small vanilla QR encoder (byte mode is enough) rendering
      a vCard 3.0 chunk, so one contact can be scanned phone-to-phone. Lazy-loaded like
      the phone metadata. Good demo feature and a natural fit for the offline promise.

### P2

- [ ] **Download file naming**: sensible defaults (`contacts-merged-2026-10-21.vcf`)
      derived from the content, never silently overwriting.
- [ ] **Per-tool landing pages**: static pages for the queries people type
      (`vcf-to-csv`, `csv-to-vcf`, `merge-vcf`, `split-vcf`), each a thin page reusing the
      existing assets with its own sample. The main competitor ranks with exactly this
      shape. Constraint: no duplicated logic. A landing page is markup plus
      `initCompare()` or the index wiring, nothing copy-pasted.

### v1.4 exit criteria

- A 4-contact merge exports as 4 valid `.vcf` files in one ZIP that open on iOS and
  Android.
- Each preset produces a file the named target imports without manual repair. Verify one
  real device or emulator per preset before claiming support.
- The XLSX opens in Excel, LibreOffice and Sheets with correct columns and no repair
  prompt.

## v1.5 — Surface & trust

Goal: the tool is good and the site around it is not. Everything here is what a stranger
meets *before* they trust an unknown web page with their contacts file. Nothing here changes
parsing, writing or the contact model, so it can run in parallel with any other release and
must never block v2.0.

Rationale and rejected shapes: `docs/DECISIONS.md` D-001 (homepage), D-004 (comparison page),
D-006 (docs layering). Copy rules: `docs/LEGAL.md`.

### P0

- [ ] **Landing page at `/`, converter moves to `convert.html`**: hero (what it does, in one
      sentence), the offline promise, three concrete steps, a sample-free "open the
      converter" CTA, and an FAQ built from real search questions ("is my file uploaded?",
      "does it work offline?", "which vCard versions?"). `index.html` becomes the landing
      page and the current body moves to `convert.html` *unchanged* — the page moves, the
      markup does not fork. Every `nav`/`footlinks` block on every page updates in the same
      commit, and `convert.html` carries `rel="canonical"` so the two are not read as
      duplicates. Do **not** add a drop zone to the landing page: handing a file across pages
      needs storage, and `file://` storage is per-file, so it would fail exactly where the
      app promises to work. ~3h.
- [ ] **Legal page set, linked from every footer**: `privacy.html`, `terms.html`,
      `accessibility.html`, `licenses.html`. Content rules and the verified storage
      inventory are in `docs/LEGAL.md`. The privacy page must list **every** `localStorage`
      key that exists at the time — today that is `vcfconv-theme` alone — and must be
      updated in the same commit as v1.1's autosave key. No cookie banner, because there are
      no cookies; no "GDPR compliant" badge, because that is a legal conclusion rather than a
      feature. Terms state "as is" and exclude warranty to the extent permitted; a data
      controller identity is a marked placeholder until the publisher supplies one. ~3h.

### P1

- [ ] **Competitor comparison page, under evidence rules**: a capability table with a
      `checked:` date and a source link per row, stating the app's own gaps plainly
      ("not implemented") because that is both honest and more persuasive. No logos, no
      screenshots, no superlatives, no claims about a competitor's roadmap. Compare
      browser-based converters only — a desktop batch tool does not meet "the same needs"
      under Directive 2006/114/EC Art. 4(2). Add a "something wrong? open an issue" line and
      act on it. `docs/LEGAL.md` has the conditions and the citations.
- [ ] **Per-page metadata audit**: unique `<title>` and description per page, Open Graph and
      Twitter card tags, and a canonical link everywhere. Currently all three pages share one
      description and there is no canonical.

### P2

- [ ] **`sitemap.xml` and `robots.txt`**: five to eight URLs, hand-maintained, dated. A
      static site with no build step can afford both.
- [ ] **Accessibility statement**: target WCAG 2.2 AA, list known gaps honestly, give a
      reporting route. Only claim what an audit can back — see v1.1's keyboard/focus work.

### v1.5 exit criteria

- Every page is reachable in two clicks or fewer from `/`, and no page is a dead end.
- The footer's page list and legal links are identical on every page.
- The privacy page's storage inventory matches `grep -r localStorage assets/*.js *.html`
  exactly — same keys, same purpose, no extras in either direction.
- The comparison page passes the `docs/LEGAL.md` checklist: every row dated and sourced, no
  logos, no superlatives, no unverifiable claim.
- The landing page opens from `file://` with zero console errors and zero network requests.

## v2.0 — Scale

Goal: keep the same promises at 10k contacts, and pay down the metadata and i18n
architecture. Nothing here changes the formats the tool writes.

### P0

- [ ] **Performance: Web Worker parsing plus a virtualized table**: parsing is synchronous
      on the main thread, so a 10k-contact VCF freezes the UI. Move parsing into a worker
      (`assets/parse-worker.js`, same `lib.js`, no build step) and render only the visible
      rows. Must still work from `file://`: test it there before shipping, because worker
      plus `file://` is the classic trap.
- [ ] **PHOTO support end-to-end**: `PHOTO` properties are currently skipped. Parse base64
      (and `VALUE=uri` data URIs), show a thumbnail, and export unchanged. Add a size
      guard so a photo-heavy VCF does not blow the autosave quota.

### P1

- [ ] **jCard (RFC 7095) import/export**: the JSON representation of vCard, useful for
      API-minded users and extra round-trip safety. Revisit `ical.js` as a reference at
      this point, not earlier, and only behind tests that cover it.
- [ ] **i18n**: a UI strings table, English first, then the locales the competitor
      serves. One object per locale, no build step, and the stored key names stay stable.
      Do this after the merge dialog copy settles in v1.3, not before.

### P2

- [ ] **Framework migration (designated successor: plain Svelte)**: only if the trigger
      fires. See **Decisions** for the full record.

### v2.0 exit criteria

- 10k contacts parse and render on a mid-range laptop with no long task over 200 ms on the
  main thread after load.
- A VCF with 20 embedded photos round-trips with the photos intact.
- The app still opens from `file://` with no build step and no network request.

## Competitive gap analysis (2026-10)

Evidence behind the calendar above. Sources reviewed: VCFConverter (`vcf.wadesk.io`,
feature set and FAQ), Aryson splitter/merger (paid desktop software), `mbideau/vcardtools`
(vCard library), and CRM dedupe flows in HighLevel, Business Central and CiviCRM.

| Capability | Competitor state | This app today | Lands in |
|---|---|---|---|
| Field-level conflict resolution | CRM tools review field by field; desktop merge tools do not | Not implemented, merge is per contact | v1.3 P0 |
| Encoding / UTF-16 handling | Called out in the FAQ as a common failure | Everything read as UTF-8 | v1.1 P0 |
| CSV dialect presets (Google, Outlook, iCloud) | Not offered as presets, columns mapped by hand | Generic header, two-column and TSV detection | v1.2 P0 |
| vCard 2.1 / 4.0 | Mixed, several converters read 2.1 only | 3.0 only | v1.2 P0 / P1 |
| Split one VCF into many files | Paid desktop tool | Not implemented | v1.4 P0 |
| XLSX / XLS | Supported | CSV only | v1.4 P1 |
| Device / OS export presets | iOS, Android, Huawei, Xiaomi, WeChat | One 3.0 writer | v1.4 P0 |
| Per-query landing pages | Yes, one page per conversion query | Three pages, none query-shaped | v1.4 P2 |
| Multi-language UI | Yes | English only | v2.0 P1 |
| Large-file performance | Desktop tools, no browser worker story | Synchronous parse | v2.0 P0 |
| Photos | Partial | Skipped | v2.0 P0 |
| No upload, no install | No, server or installer | **Yes** | Keep, this is the differentiator |
| Works offline and from `file://` | No | **Yes** | Keep, do not regress |

Reading of the market: the paid tools win on volume and format coverage, not on trust.
Every capability above that can be implemented client-side erodes the reason to upload a
contact list to a stranger's server. Anything that would need a backend (cloud sync,
enrichment, account history) stays out of scope on principle, not for lack of effort.

## Decisions on record

### 1. Versioning: semver, one theme per minor (2026-10)

`v1.1` Foundation, `v1.2` Dialects, `v1.3` Merge intelligence, `v1.4` Output reach,
`v2.0` Scale. Each release is independently useful and testable, and the risky
architectural work (worker parsing, vendored metadata) is isolated in `v2.0` instead of
being smeared across every release. Patches carry fixes only.

### 2. Phone normalization: vendor the `libphonenumber-js` metadata, not the library (2026-10)

Ship `libphonenumber-js`'s `metadata.min.json` as a **lazy local asset** and write the
small amount of matching logic we need, instead of vendoring the library or calling an
API.

- **Why not the full library:** it is a parser and formatter for thousands of cases. We
  need "do these two strings plausibly denote the same subscriber". Duplicating a mature
  parser inside a zero-build project adds more maintenance surface than a ~100-line
  matcher.
- **Why the metadata is still right:** national-prefix rules, country calling codes and
  valid length ranges are facts we cannot invent. Hand-rolled heuristics are exactly why
  the current `normPhone` fails on `+49 (0) 30…`.
- **How it ships (important):** not as a `fetch()`ed `.json`. `fetch` on a `file://` page
  is blocked by CORS in Chromium, which would break the core promise. Vendor it as
  `assets/vendor/phone-metadata.min.js`, exposing `window.VCFStudio.phoneMetadata`, and
  load it by injecting a `<script>` element on first use. Script tags are not subject to
  that CORS rule, so `file://` keeps working.
- **Size:** the minimal metadata set is roughly 80 KB minified (about 25-30 KB gzipped).
  Measure it at vendoring time rather than trusting this figure. It must never sit in the
  first-load path: no reference from any HTML page, only dynamic injection from `lib.js`.
- **Scope of the matcher:** resolve the country code, strip the national prefix for the
  detected country, and compare length-validated national numbers. Treat `+` values as
  country-coded and bare values as local to a user-chosen default country. Full
  formatting and validation parity with libphonenumber is explicitly not a goal.
- **Fallback:** if the asset is missing or fails to load, fall back to today's heuristic
  and label matches "probable" at best. Never block a merge on the asset.
- **Licensing:** record both licences in a `LICENSE-THIRD-PARTY.md` (the library is MIT,
  the metadata derives from Google's libphonenumber under Apache-2.0). Verify the exact
  attribution text at vendoring time instead of trusting this note.
- **Rejected alternative:** a CDN link. It is a network call, it contradicts the privacy
  promise, and it fails offline.

### 3. vCard library: extend our own parser (2026-10)

`vcard4` covers 4.0 only and would duplicate the model we already have for 3.0. Adopting
it means two parsers and a mapping layer. Decision: extend `parseVCF` and `contactsToVCF`
for 2.1 and 4.0 in v1.2 and keep one contact model. `ical.js` is deferred to v2.0 as a
reference for jCard, not as a runtime dependency.

### 4. Framework: plain Svelte, only if the trigger fires

- **Trigger:** recurring vanilla DOM-sync bugs (focus races, stale renders, double
  commits) around a feature like the field-by-field merge dialog. Not line count, not
  fashion. The guards in `ui.js` (`_renderCanceling`, `_committing`) fixed the first
  generation; if every feature adds two more, that is the signal.
- **Plain Svelte, not SvelteKit.** Svelte compiles to static JS and CSS, so "upload a
  folder, no CDN, works offline" survives, which the privacy promise requires. SvelteKit
  exists for server-side needs this app does not have.
- **Astro is not a migration target.** It suits content-heavy zero-JS sites; this project
  is the inverse. It is only plausible for a separate docs or blog wing, with the tool
  staying vanilla.
- **Preact (vendored, about 13 KB, no build)** is the escape hatch if reactivity is wanted
  while keeping zero-build.
- **Migration shape:** `lib.js` is DOM-free with a clean exported API and ports unchanged;
  only `ui.js` and `compare.js` are rebuilt. Commit the test suite first.

## Done

- [x] OG image (`assets/og.png`, 1200×630) plus `og:` meta tags on all three pages
      (2026-12 session). Post-publish follow-up: absolute `og:image` URL swap, see
      Housekeeping.
- [x] GitHub Pages live at https://drizzer.github.io/contacts-studio/ — repo
      `drizzer/contacts-studio`, Pages from `main`/root, `.nojekyll` included.
      Verified live: all three pages, assets and og.png return 200.
- [x] Release `v1.0.0` published (tag plus release notes), the v1 milestone and rollback
      point. One squashed commit `263015e` on `main`.

## Declined (do not re-propose without asking)

- Single-page app / tab refactor of the three pages. The preference is plain vanilla for
  now; revisit only if the project grows.
- PWA (manifest plus service worker, installable app).
- Import-from-clipboard button.
- URL-parameter sample loading / deep-link demos.
- CDN-hosted dependencies: any `fetch` or `<script src>` pointing off-origin. That is a
  network call by another name, and it breaks offline use, `file://` and the privacy
  promise.
- Cloud sync, accounts, or server-side dedupe. Requires a backend.

## Housekeeping / publishing

- [x] **Hosting: GitHub Pages**, repo `drizzer/contacts-studio`, live at
      `https://drizzer.github.io/contacts-studio/`. All asset paths are relative, so the
      project-page subpath works as-is. `.nojekyll` committed as insurance against Jekyll.
- [ ] **Post-publish: verify `og:image`**: the relative `assets/og.png` resolves on the
      project-page subpath, so no swap is needed for GitHub Pages. If the site moves to a
      custom apex domain, prefer an absolute URL in the three `<head>` blocks, and check
      the preview in the platform's sharing debugger after deploying.
- [ ] **In-app Help modal**: turn the footer "How it works" and format notes into a `?`
      dialog so footers stay lean. Natural companion to the v1.2 dialect UI.
- [ ] **Keyboard / a11y pass**: modal focus trap, arrow-key row navigation, skip links. Do
      the focus trap together with the v1.3 merge dialog rather than twice.
- [x] **`LICENSE-THIRD-PARTY.md`**: created 2026-10-21 as an empty register, so the first
      vendored asset cannot land without its notice. It becomes load-bearing in v1.1, where
      the Lucide subset arrives — moved up from v1.3, because v1.2's dialect UI and v1.3's
      merge dialogs both need a real icon vocabulary.

## Release checklist (run at every tag)

1. `node --check` on each asset file, then `node tests/test.js`.
2. Drive all three pages from `file://` and over HTTP. The console must show zero errors.
3. Confirm the items ticked here match the release notes.
4. Update `README.md` (features, layout) and `AGENTS.md` (new invariants) in the same
   commit.
5. Tag, publish release notes, verify the live site, then tick **Done** with the hash.

## Suggested order (next sessions)

0. **Unblock the board** (`gh auth refresh -s project,read:project`), create the project per
   `docs/KANBAN.md`, and seed only the v1.1 P0 items. The prep documents in `docs/` are
   committed already; nothing else waits on them.
1. Commit the test suite (v1.1 P0), the safety net for everything below it.
2. Encoding detection and BOM sniffing (v1.1 P0), the smallest change with the largest
   real-world effect.
3. Export the filtered or selected view (v1.1 P0).
4. Undo/redo, then autosave (v1.1 P1).
5. Cut `v1.1`, then open v1.2 with the three dialect fixtures.

## Notes for agents

- Update this file whenever scope changes: new ideas get a version and priority under the
  right release, finished items move to **Done**, declined items move to **Declined** with
  a reason.
- An idea without a version is not planned. Do not add a backlog section that bypasses the
  calendar, and do not start a later release while an earlier P0 is open unless asked.
- Do not commit fixture data with real personal data; keep samples generic.
- If an idea touches the invariants in `AGENTS.md`, read them first, especially the editor
  entity trap, the Esc/focusout guards, and the three theme blocks.
- Vendored assets are an exception to "no dependencies", not a repeal of it: local file
  only, lazy, attributed, with a working fallback.

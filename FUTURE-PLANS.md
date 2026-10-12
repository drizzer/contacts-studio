# FUTURE-PLANS.md — Roadmap

Feature ideas and follow-ups for vCard ⇄ CSV Studio. Read together with
`README.md` and `AGENTS.md`. When an item is done, move it to **Done** with the
date and commit hash. When an item is declined, move it to **Declined** with the
reason — do not silently delete it.

## Ground rules (apply to every idea here)

- Pure static: no build step, no framework, no package manager, no network calls.
- Must keep working when opened via `file://` and from any static host.
- All parsing/conversion stays client-side; nothing is ever uploaded.
- Generic sample data only (no real personal data in fixtures).

## Status

- `[ ]` proposed, not started
- `[~]` in progress
- `[x]` done (move to **Done** with date + commit)

## Done

- [x] OG image (`assets/og.png`, 1200×630) + `og:` meta tags on all three pages
      (2026-12 session). Post-publish follow-up: absolute `og:image` URL swap, see
      Housekeeping.
## Declined (do not re-propose without asking)

- Single-page app / tab refactor of the three pages — user prefers plain vanilla
  now; revisit only if the project grows.
- PWA (manifest + service worker, installable app).
- Import-from-clipboard button.
- URL-parameter sample loading / deep-link demos.

## Quick wins (small effort, immediate value)

- [ ] **Committed test suite** — `tests/test.js`, run with `node tests/test.js`.
      Turn the regression checks documented in AGENTS.md "How to verify" into a
      real, committed suite: parseVCF on a multi-card fixture (names, multi-TEL,
      unicode, schema capture), contactsToCSV exact lines (`"Name,=""PHONE"""`),
      parseCSV+rowsToContacts round-trip, contactsToVCF `N:;Name;;;` + schema
      emission, lossless round-trips both directions, merge/dedupe keep schema.
      ~1–2h. Protects the parser forever; makes agent sessions safer.
- [ ] **Encoding detection (BOM sniffing)** — read files as ArrayBuffer and sniff
      the BOM: UTF-8, UTF-16LE/BE (Outlook exports are UTF-16), decode with
      `TextDecoder`. Currently UTF-16 CSVs are read as UTF-8 and garbled. ~30 min.
- [ ] **Undo / redo (Ctrl+Z / Ctrl+Y)** — snapshot stack of the contacts array on
      every mutation (edits, deletes, merges). Show an undo entry in the selbar.
      Small-medium.
- [ ] **Export the filtered / selected view** — "Download what you see": feed
      `table.filtered()` or the selection to the writers instead of all contacts.
      Tiny.
- [ ] **Session autosave** — autosave sources + edited contacts to
      `localStorage` or IndexedDB; on load, offer "Restore previous session?".
      Still 100% local (nothing uploaded). Protects long merge sessions from an
      accidental tab close.
## Medium effort — core user value

- [ ] **Real-world CSV dialect presets** — Google Contacts, Outlook.com and iCloud
      each export different column layouts. Per-dialect column-mapping tables plus
      a preview ("Detected Google Contacts export — Name → FN, Phone 1 → TEL …").
      The three exports people actually have, made first-class.
- [ ] **Field-by-field merge dialog** — merging is currently all-or-nothing per
      contact. Side-by-side dialog to pick which phone/email/address survives from
      which source. Biggest gap between what the compare pages promise
      ("resolve conflicts") and what they do today.
- [ ] **Fuzzy duplicate detection** — phone normalization toward E.164 with a
      default country hint, name casefolding/accent stripping, optional
      edit-distance, with confidence badges ("probably same"). Reduces false
      "duplicate name" noise (`+49…` vs `+49 (0)…`).
- [ ] **vCard 2.1 read + 4.0 read/write** — 2.1 is still exported by old Outlooks
      (different escaping, base64 PHOTO); 4.0 (RFC 6350) uses URI-style `tel:` and
      different parameters. Pragmatic scope: parse-all, write 3.0.
- [ ] **Split a merged VCF into one file per contact** — pairs with the compare
      pages: "export 4 contacts → 4 files" in a ZIP. A store-only (no
      compression) ZIP writer is ~150 lines of vanilla JS, no dependency.
## Bigger bets (when there is a reason)

- [ ] **Performance: Web Worker parsing + virtualized table** — parsing is
      synchronous on the main thread; a 10k-contact VCF will freeze the UI. Move
      `parseInput` into a Worker, render table rows in a window.
- [ ] **PHOTO support end-to-end** — `PHOTO` props are currently skipped; parse
      base64, thumbnail column, re-export.
- [ ] **Excel export** — minimal `.xlsx` is ZIP + XML; the store-only ZIP writer
      from the split-VCF item makes this feasible dependency-free.
- [ ] **jCard (RFC 7095) import/export** — JSON representation of vCard; useful
      for API-minded users and extra round-trip safety.
- [ ] **QR code per contact** — tiny vanilla QR encoder; scan to transfer a
      contact phone-to-phone. Good demo feature.
- [ ] **i18n** — UI strings table; English first, trivially extensible later.
- [ ] **Framework migration (designated successor: plain Svelte)** — the decision
      record:
      - **Trigger:** recurring vanilla DOM-sync bugs (focus races, stale renders,
        double-commit) around a feature like the field-by-field merge dialog —
        not line count, not fashion. The guards in ui.js (`_renderCanceling`,
        `_committing`) fixed the first generation; if every feature adds two
        more, that is the signal.
      - **Choose plain Svelte, NOT SvelteKit.** Svelte compiles to plain static
        JS/CSS files: the deploy story stays "upload a folder, no CDN, works
        offline", which the privacy promise requires. SvelteKit exists for
        server-side needs (SSR, API endpoints, file routing, data loaders) —
        this app has none. SvelteKit becomes relevant only if a backend or
        much richer routing appears; then start it with `adapter-static` and
        `ssr=false` (which is effectively plain Svelte with ceremony).
      - **Astro is not a migration target.** It excels at content-heavy sites
        rendered to zero-JS HTML; this tool is the inverse (three pages that
        are one big interactive component each). Astro only makes sense for a
        separate docs/blog/landing wing, with the tool staying vanilla.
      - **Preact (vendored, ~13KB, no build)** is the escape hatch if
        reactivity is wanted while keeping the zero-build constraint.
      - **Migration shape:** `assets/lib.js` is DOM-free with a clean exported
        API and ports unchanged; only `ui.js` + `compare.js` are rebuilt.
        Commit the test suite first (see Quick wins) as the safety net.
## Housekeeping / publishing

- [x] **Hosting target chosen: GitHub Pages** — repo `drizzer/contacts-studio`,
      live at `https://drizzer.github.io/contacts-studio/` (a project page; the
      apex `contacts-studio.github.io` would need a separate org/user of that
      name). All asset paths are already relative, so the subpath works as-is.
      `.nojekyll` committed as insurance against Jekyll processing.
- [ ] **Post-publish: verify `og:image`** — the relative `assets/og.png`
      resolves correctly on the project-page subpath, so no swap is needed for
      GitHub Pages; if the site later moves to a custom apex domain, prefer an
      absolute URL (`https://YOUR-DOMAIN/assets/og.png`) in the three `<head>`
      blocks. Verify the preview in the platform's sharing debugger after deploy.
- [ ] **In-app Help modal** — turn the footer "How it works" / format notes into
      a `?` dialog so footers stay lean.
- [ ] **Keyboard / a11y pass** — modal focus trap, arrow-key row navigation,
      skip links.

## Suggested order (next sessions)

1. Committed test suite (protects everything below it)
2. Encoding detection (BOM sniffing)
3. Export filtered/selected view
4. Field-by-field merge dialog (first feature-sized project)
5. Anything else per need; do the absolute `og:image` swap at publish time.

## Notes for agents

- Update this file whenever scope changes: new ideas get `[ ]` entries in the
  right section; finished items move to **Done** with date + commit hash;
  declined items move to **Declined** with the reason and date.
- Do not commit fixture data with real personal data; keep samples generic.
- If an idea touches the invariants in `AGENTS.md`, read them first.





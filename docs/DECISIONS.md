# DECISIONS.md — decision records

Why the site and the tool are shaped the way they are. Append-only: a decision that
changes gets a new entry which supersedes the old one, rather than a silent rewrite.
Every entry names the alternative that was rejected and the constraint that killed it.
Read together with `FUTURE-PLANS.md` (what ships, and when) and `AGENTS.md` (how the
code works).

Status values: **accepted**, **proposed**, **superseded by D-xxx**, **declined**.

The hard constraint behind most of these: the app must keep working from `file://`, with
no build step, no package manager and no network request. Anything that cannot survive
`file://` is not a candidate, however good the library is.

---

## D-001 — the root URL becomes a landing page; the converter moves to `convert.html`

Status: accepted (2026-10-21). Not yet implemented.

Context: `index.html` *is* the tool. There is no marketing or explanatory surface, and the
GitHub Pages root is what the repo's `homepage` field, the og:image and every external link
point at. Competitors rank with a landing page above the tool plus one page per query.

Options weighed:

1. Keep `index.html` as the tool and add `home.html` for the landing content.
2. `index.html` becomes the landing page; the tool moves to `convert.html`.
3. One page: marketing copy stacked above the existing converter.

Decision: **option 2**.

Reasoning: option 1 leaves the strongest URL in the site pointing at a utility page that
never explains what the site is for — which is the entire job of a landing page. Option 3
pushes the drop zone below the fold and couples marketing copy edits to the tool's DOM, so
neither can change without touching the other. Option 2 costs exactly one click on a
bookmarked root URL and buys the shape the roadmap already wants in v1.4 (per-query landing
pages): one hero at `/`, then thin, query-shaped pages that link into the real tool.

Consequences and constraints:

- `convert.html` carries the current `index.html` body unchanged, including `.grid`,
  the dropzone ids and the `assets/ui.js` wiring. The page moves; the markup does not fork.
- The landing page gets its own `<title>`, description and canonical link, and the tool
  page gets `rel="canonical"` pointing at `convert.html` so the two are not read as
  duplicates.
- **No file handoff across pages.** A drop zone on the landing page that forwarded a
  chosen file to `convert.html` would need `sessionStorage`, and on `file://` each file is
  its own opaque origin, so the handoff silently fails precisely where the app promises to
  work. A plain CTA link is the only honest option.
- Both pages, and all three current pages, must update the `nav` and `footlinks` blocks in
  the same commit or the site has dead ends.
- Old links to `index.html` keep working — they now reach the landing page, not a 404.

---

## D-002 — icons: Lucide, inlined as `<symbol>` in each page

Status: accepted (2026-10-21). Not yet implemented.

Context: the UI currently draws its icons as HTML entities (`&#8646;` for the logo,
`&#128193;` for "Choose file", `&#9681;` for the theme toggle). Entity glyphs render as
whatever the platform's emoji font decides, so the same page looks different on Windows,
macOS and Android, they cannot take a stroke colour or a size from CSS, and they cannot be
matched to the teal accent.

Decision: vendor a **subset of Lucide** and inline it as `<symbol>` definitions in a hidden
`<svg>` at the top of `<body>` on each page, referenced by `<use href="#i-name">`.

Why Lucide: ISC-licensed (the Feather-derived icons inside it are MIT), ~1600 icons on a
24px grid with `stroke="currentColor"` by default, so one icon inherits the theme colour in
both light and dark mode with no extra work. No visible attribution is required; the full
notice must travel with the files, which `LICENSE-THIRD-PARTY.md` does.

Rejected alternatives:

- **External sprite** (`<use href="assets/icons.svg#i-name">`). This is a cross-document
  reference, and browsers treat it as a CORS-governed fetch. Chrome blocks it from
  `file://`, so the icons would vanish in exactly the mode the project tests first. This is
  the single most likely way to get this wrong.
- **Fetch and inject the sprite at runtime.** Same failure: a `fetch()` of a local file is
  still a network-layer request, blocked on `file://`, and it contradicts the "no network
  requests" claim in the README.
- **Icon font.** Another vendored binary, monochrome glyphs, no per-icon stroke control.
- **Remix Icon (Apache-2.0).** Equally usable and larger, but Apache-2.0 adds a NOTICE
  obligation and a patent clause for no benefit here; Lucide's stroke weight is also closer
  to the current UI.
- **CDN `<script>` or a React/Vue icon package.** Out of the question: off-origin request,
  and no framework exists to install into.

Cost of the chosen shape: the used subset is duplicated in each page's HTML. With roughly
20 icons at ~200 bytes each that is ~4 KB per page, unminified, and it is the price of
`file://` support. Generate the sprite block once and paste it into each page; do not
hand-maintain three copies that drift apart — add the comparison to the release checklist.

---

## D-003 — component library: adopt shadcn/ui's token contract, vendor no framework

Status: accepted (2026-10-21). Not yet implemented.

Context: shadcn/ui is the reference design system for this style of UI and it is MIT, but it
distributes React components as source for Tailwind projects. There is nothing to drop into
a no-build, dependency-free page.

Decision: adopt shadcn's **CSS variable contract** as an alias layer over the tokens that
already exist in `assets/style.css`, and change no visual values.

The alias block maps shadcn's names onto the current ones:

| shadcn | current | note |
|---|---|---|
| `--background` | `--bg` | |
| `--foreground` | `--text` | |
| `--card` | `--panel` | |
| `--secondary` / `--muted` | `--panel2` | |
| `--muted-foreground` | `--muted` | |
| `--primary` | `--accent-fill` | the teal fill |
| `--border` | `--border` | same name, same meaning |
| `--ring` | `--accent` | focus outline |
| `--destructive` | `--danger` | |
| `--accent` | `--sel` | **collision — see below** |

The one trap: in shadcn, `--accent` is a subtle hover/selected surface, not the brand
colour. In this codebase `--accent` *is* the brand teal. Mapping names naively would
recolour every hover state. The alias above keeps shadcn's `--accent` on `--sel` (the
selection tint) and puts the brand teal on `--primary`, which is where shadcn expects a
button fill. Values are copied, never rewritten, so the change must be proven by a
before/after screenshot diff of all three pages in both themes.

Why bother: it makes future theme packs (shadcn themes, Basecoat style packs) droppable
without a rewrite, and gives contributors a vocabulary they already know. It costs one
alias block and zero bytes of logic.

Rejected for now:

- **Basecoat** (MIT; the closest thing to a framework-free shadcn port, and it now ships a
  no-build vanilla CSS+JS path, so it is technically viable). It is a *second design
  system*: it brings `.btn`, `.card`, `.input` and its own token set, which would mean
  rewriting the markup and CSS of all three pages and re-testing every interaction. That is
  a v2.0-scale change and it would score badly against the project's own rule that no
  release breaks documented `v1.0.0` behaviour.
- **21st.dev / Magic UI** component catalogs. Useful as a source of ideas and markup
  patterns; not vendorable. Magic UI's motion components depend on framer-motion, and
  per-item licences vary, so any component copied in future needs its licence checked
  individually and recorded in `LICENSE-THIRD-PARTY.md`.

Trigger to revisit: if v2.0's framework decision fires (see `FUTURE-PLANS.md`
**Decisions**), evaluate Basecoat in the same pass — a component vocabulary is cheaper to
adopt during a rewrite than after one.

---

## D-004 — a competitor comparison page is allowed, under evidence rules

Status: accepted (2026-10-21). Content rules live in `LEGAL.md`; the page itself is v1.5.

Decision: yes to a comparison page, no to anything that reads as an advertisement. It
compares **features the app actually has, checked on a stated date, with a link to where the
claim came from**, and it names competitors only as far as needed to identify them.

What is banned: logos and brand assets, screenshots of competitor UI, "best / better / #1 /
the only", price claims without a dated source, and any claim about a competitor's roadmap
or intentions. Reasoning and the legal basis (EU Directive 2006/114/EC Art. 4; US nominative
fair use) are in `LEGAL.md`.

Consequence: the page is maintained like data, not like copy. Every row carries a
`checked:` date, and a stale row is corrected or deleted before publishing a release.

---

## D-005 — GitHub Projects is the board; `FUTURE-PLANS.md` stays the source of truth

Status: accepted (2026-10-21). Blocked: the `gh` token lacks the `project` scope.

Decision: one Projects v2 board per repo, grouped by **Status**, with **Priority** and
**Area** as single-select fields. Release grouping uses the existing GitHub **milestones**
(`#1 v1.1 Foundation` … `#6 v1.5 Surface & trust`) rather than a duplicate `Release` field —
one fact, one home. Milestone *numbers* are creation order, not release order: v2.0 is `#5`
and v1.5 is `#6`, so always sort by the title, never by the number.

`FUTURE-PLANS.md` remains the authority for *scope*: an item exists on the board only
because a roadmap bullet exists, and the card title is that bullet's bold lead, verbatim, so
the two can be diffed by eye or by script. The board is the authority for *state* (what is
in progress this week); the file is the authority for *what a release contains*.

Sync moments, and only these: item created, work started, work finished, release cut. Not a
hook, not a bot — the repo has no workflows and this stays true.

Exact setup commands and the item-seeding procedure are in `docs/KANBAN.md`.

---

## D-006 — `docs/` in the repo is the record; the wiki is a pointer

Status: accepted (2026-10-21).

Decision: decision records, legal policy and board procedure live in this repo under
`docs/`, because they must be reviewable in the same history as the code they constrain.
The GitHub wiki, once seeded, holds a short front page that links here — never a second copy
of the same text, which is how documentation starts disagreeing with itself.

Consequence: the wiki's git repo does not exist until a first page is created through the
web UI (there is no API for initialization). That is a one-time manual step, recorded in
`docs/KANBAN.md`.



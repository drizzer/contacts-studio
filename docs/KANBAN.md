# KANBAN.md — the GitHub Projects board

The board is a view of `FUTURE-PLANS.md`, not a second plan. This file is the procedure for
building it and the rules for keeping it honest.

Design rationale: `docs/DECISIONS.md` D-005.

---

## 0. Status: board live, wiki still manual

Built 2026-10-21 with `gh` 2.102.0 and a refreshed token carrying `project` and
`read:project`:

| | |
|---|---|
| Project | **#2 `contacts-studio roadmap`** — https://github.com/users/drizzer/projects/2 |
| Node id | `PVT_kwHOAsmX0c4BoFim` |
| Linked to repo | yes — it appears on the repo's Projects tab |
| Fields | `Status` (built-in), `Priority` (P0/P1/P2), `Area` (10 options) |
| Seeded | the three v1.1 **P0** issues only — see §3 |

The scope failure that used to stand here, for the record: `repo` was present (issues,
labels and milestones all worked) but `project` and `read:project` were not, and
`gh project list` returned
`error: your authentication token is missing required scopes [read:project]`. The fix is
`gh auth refresh -s project,read:project`, which is interactive — it prints a one-time code
and opens a browser — so it has to be run at a terminal by the account owner. Do not work
around it with a personal access token in the environment: the board would then belong to a
credential that nobody remembers to rotate.

**One API quirk, documented because it cost real time.** A card added seconds earlier can be
returned by `item-add` *and* by `node(id:)` while being absent from the project's default
`items` connection: `gh project item-list`, `gh project view` and `ProjectV2.items(first:)`
all report the short count, and re-adding hands back the *same* item id instead of an error.
Query it with `items(first: 50, archivedStates: [ARCHIVED, NOT_ARCHIVED])` — that returns it,
and running the explicit query appears to force the index to catch up, after which the
default connection agrees and `gh project item-list` reports the true count. Do not delete
and re-add the card chasing this: it changes the item id and fixes nothing.

The wiki has a **separate, still-manual** step, at the end of this file.

---

## 1. Field design

| Field | Type | Options | Why |
|---|---|---|---|
| Status | built-in | Todo / In Progress / Done | the columns; built-in, cannot be removed |
| Priority | single select | `P0`, `P1`, `P2` | matches the roadmap's own vocabulary |
| Area | single select | `parsing`, `csv`, `vcf`, `merge`, `export`, `ui`, `site`, `docs`, `legal`, `tooling` | filtering across releases |

**No `Release` field.** The six milestones already encode it — `#1 v1.1 Foundation`,
`#2 v1.2 Dialects`, `#3 v1.3 Merge intelligence`, `#4 v1.4 Output reach`,
`#5 v2.0 Scale`, `#6 v1.5 Surface & trust` — and a milestone is attached to the issue
itself, so it survives being filtered off the board. A duplicate field is one more thing to
keep in sync for no gain.

Note the numbering: milestones are numbered in *creation* order, so v2.0 is `#5` and v1.5 is
`#6`. Sort by title, never by number, and do not "fix" it by deleting and recreating v2.0 —
that would break every link to it.

Status is the only field that changes during normal work. Renaming the built-in Status
options is not supported by the CLI; if Todo/In Progress/Done is not wanted, rename them once
in the web UI and leave them alone.

---

## 2. Build it

Run from the repo root. `-N` below is the project number printed by `create` — for the
current project that is **2**, and this recipe has already been run against it. Keep it as
the recipe for a *fresh* project (a fork, or a rebuild after deletion), not as a to-do list.

```powershell
# 1. create the project (returns its number and node id as JSON)
gh project create --owner drizzer --title "contacts-studio roadmap" --format json

# 2. attach it to this repository, so it appears on the repo's Projects tab
gh project link <N> --owner drizzer --repo drizzer/contacts-studio

# 3. custom fields
gh project field-create <N> --owner drizzer --name Priority --data-type SINGLE_SELECT `
  --single-select-options "P0,P1,P2"

gh project field-create <N> --owner drizzer --name Area --data-type SINGLE_SELECT `
  --single-select-options "parsing,csv,vcf,merge,export,ui,site,docs,legal,tooling"

# 4. read back the field ids and option ids you need for step 6
gh project field-list <N> --owner drizzer --format json
```

---

## 3. Seed the items

An issue per roadmap bullet, **not** a draft card. An issue carries the milestone, labels,
comment history and commit links; a draft card carries a title. The board is only worth
trusting if the thing on it is real.

Card title = the roadmap bullet's bold lead, verbatim, so the board and the file can be
compared by eye. The issue body takes the bullet's full text plus its `FUTURE-PLANS.md`
anchor.

```powershell
# create with the milestone already attached (milestone is a number, not a title)
gh issue create --repo drizzer/contacts-studio `
  --title "Committed test suite" `
  --body "See FUTURE-PLANS.md > v1.1 > P0. Tests: parseVCF multi-card fixture, contactsToCSV exact lines, parseCSV round-trip, contactsToVCF N:;Name;;; plus schema, lossless round-trips, mergeContacts/dedupeContacts." `
  --milestone 1 --label enhancement

# add to the board
gh project item-add <N> --owner drizzer --url https://github.com/drizzer/contacts-studio/issues/<issue>

# set Priority / Area (ids from field-list)
gh project item-edit --project-id <PVT_id> --id <ITEM_id> `
  --field-id <PRIORITY_FIELD_id> --single-select-option-id <P0_OPTION_id>
```

Seeded 2026-10-21 — one issue per v1.1 P0 bullet, each labelled `enhancement` and attached to
the `v1.1 Foundation` milestone:

| Issue | Status | Priority | Area |
|---|---|---|---|
| #1 `Committed test suite (tests/test.js)` | Todo | P0 | tooling |
| #2 `Encoding detection: BOM sniffing and UTF-16 decode` | Todo | P0 | parsing |
| #3 `Export the filtered or selected view` | Todo | P0 | export |

`gh issue create --milestone` takes the milestone **title**, not its number. `--milestone 1`
fails with `could not add to milestone '1': '1' not found`, and that failure aborts the whole
command rather than creating the issue unmilestoned — so a failed run leaves no half-seeded
state to clean up, which is the good version of that surprise.

Order of work: v1.1 P0 items only. Seeding v1.3 and v1.4 cards now creates a wall of
Todo that nobody will touch for months, and a board that is 95% noise stops being read.
Seed one release at a time, at the start of that release.

---

## 4. Status discipline

| Roadmap | Board | Meaning |
|---|---|---|
| `[ ]` | Todo | planned, not started |
| `[~]` | In Progress | actively being worked, one at a time per person |
| `[x]` | Done | ticked in the file with date and commit hash |

A blocked P0 stays **In Progress** with a comment saying what blocks it — moving it to Todo
hides the thing that is stopping the release. A release does not ship with an open P0, so a
silently moved card is how a release ships broken.

---

## 5. Sync moments

Four, and only four: **card created**, **work started**, **work finished**, **release cut**.
No automation, no bot. The repo has no `.github/workflows` and this procedure does not add
one — a workflow that rewrites a board is harder to trust than a person moving three cards.

On a release cut, in this order: tick the roadmap, move the cards, tag, publish notes. The
file first, because it is the record; the board second, because it is the view.

---

## 6. The wiki (separate manual step)

The repo has `has_wiki: true`, but the wiki's git repository **does not exist yet** — this is
not a permission problem:

```
$ git ls-remote https://github.com/drizzer/contacts-studio.wiki.git
remote: Repository not found.
```

GitHub creates `.wiki.git` on the first page saved through the web UI; there is no API to
initialize it, which is why every "automate the wiki with a PAT" recipe starts with a
`git init` and a first push. So:

1. Open `https://github.com/drizzer/contacts-studio/wiki` and click **Create the first
   page**. Title it `Home`, save one line: a link to this repository's `docs/`.
2. Then the repo exists and can be cloned normally:

   ```powershell
   git clone https://github.com/drizzer/contacts-studio.wiki.git
   ```

3. Keep the wiki a **pointer**, not a copy (`docs/DECISIONS.md` D-006). Page titles become
   file names with hyphens, and the wiki has no pull requests, so a second copy of the
   documentation will drift with nothing to catch it.

If the wiki ends up unwanted, turn it off in Settings → Features rather than leaving an empty
tab. An empty wiki reads as an abandoned project.

---

## 7. Verification checklist

Run after the scope refresh, before trusting the board:

- [x] `gh auth status` lists `project` in Token scopes.
- [x] `gh project list --owner drizzer` shows the project.
- [x] `gh project field-list <N> --owner drizzer` shows `Status`, `Priority`, `Area`.
- [x] The project appears on the repo's Projects tab (proof that `link` worked).
- [x] Every card's milestone matches the release it belongs to in `FUTURE-PLANS.md`.
- [x] No card exists for an item in the roadmap's **Declined** section.

That last one is the check that matters. The Declined list is a decision; a card that
resurrects a declined idea on the board contradicts a decision nobody revisits.

All six verified 2026-10-21 against project #2, with three cards. Re-run this list whenever
the scope is refreshed; the wiki step in §6 is the only outstanding manual action.


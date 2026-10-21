# LEGAL.md — what the public pages may claim

Rules for the comparison page and the footer's legal pages. This is engineering policy, not
legal advice: it encodes the constraints the app's own promises create, plus the sources for
the two legal questions that actually shape the copy. Have a lawyer read the finished
comparison page before it ships if the project ever carries a brand or an income.

The app's promise is narrow and unusually easy to keep true: **no uploads, no tracking, no
network requests**. Almost every legal risk here comes from the *marketing* pages
over-claiming what the *tool* does, not from the tool.

---

## 1. Comparing against a competitor

Two regimes matter. Both permit a comparison page; both punish one that is sloppy.

### EU — Directive 2006/114/EC (comparative advertising)

Comparative advertising is "any advertising which explicitly or by implication identifies a
competitor or goods or services offered by a competitor" (Art. 2). Article 4 permits it only
if **all** of these hold:

1. it is not misleading;
2. it compares goods or services **meeting the same needs or intended for the same purpose**;
3. it **objectively compares material, relevant, verifiable and representative features**,
   which may include price;
4. it does not discredit or denigrate a competitor's marks, goods, services or circumstances;
5. for products with a designation of origin, it compares like with like;
6. it does not take unfair advantage of a competitor's reputation;
7. it does not present goods as imitations or replicas of protected goods;
8. it does not create confusion between the advertiser and the competitor.

The Directive is a *total harmonisation*: member states may neither permit comparisons that
breach these conditions nor forbid ones that meet them. Trademark use that satisfies Art. 4
does not infringe (Directive (EU) 2015/2436, recital 15: using another's mark is permitted
where it "complies with the conditions laid down by this Directive, the intended target being
solely to distinguish between them and thus to highlight differences objectively").

### US — nominative fair use and false advertising

Using a competitor's name to identify the thing being compared is nominative fair use
(*New Kids on the Block v. News America Publishing*, 971 F.2d 302 (9th Cir. 1992)) when:

1. the product is not readily identifiable without the mark;
2. only so much of the mark is used as is necessary to identify it;
3. nothing suggests sponsorship or endorsement by the mark's owner.

Separately, Lanham Act §43(a) (15 U.S.C. §1125(a)) reaches claims that are literally false
or misleading by implication, and comparative claims need substantiation.

### What that means for the page, concretely

Allowed:

- A table of capabilities, each row one feature, stating the app's own position plainly —
  including "not implemented" where that is true. It is more credible and it is honest.
- A `checked:` date per row and a link to the competitor's own page, so each claim is
  verifiable.
- Free/paid **only** as a dated, sourced fact about the competitor's published pricing.
- Naming the competitor in text.

Banned:

- Logos, brand assets, icons, screenshots of a competitor's UI. Not needed to identify them,
  and it invites both trademark and copyright complaints.
- "Best", "better than", "#1", "the only tool that…" — unverifiable superiority claims.
- Any statement about a competitor's roadmap, intentions, quality or business.
- Any claim the app cannot demonstrate from its own code. If the table says "UTF-16
  supported", the parser must handle it and a test must prove it.
- Comparison with a tool that does not meet the same needs: Art. 4(2) is about products
  "meeting the same needs or intended for the same purpose", and a desktop batch converter
  is a different product. Compare the browser-based converters; describe the desktop ones
  as a category at most.

Housekeeping that keeps the page alive:

- A visible "last checked" date at the top, not only per row.
- A correction route ("something wrong? open an issue") and a commitment to act on it.
- Delete a stale row rather than let it rot. A stale claim is a misleading claim.

---

## 2. The footer's legal pages

| Page | Must contain | Must not contain |
|---|---|---|
| Privacy | exactly what is stored, where, and that nothing is transmitted | "GDPR compliant", or "we respect your privacy" as the whole page |
| Terms | what the software is, "as is", no warranty, liability excluded to the extent permitted | fitness for a particular purpose |
| Accessibility | target level, known gaps, how to report | a WCAG conformance claim without an audit |
| Licences | the third-party notice (`LICENSE-THIRD-PARTY.md`) | a licence for the project's own code, unless one is chosen |

### Privacy, stated from the code rather than from habit

Verified against the tree on 2026-10-21:

- **No cookies.** The site sets none.
- **No analytics, no third parties, nothing loaded from another origin.** One stylesheet,
  three local scripts, one local image, one local favicon.
- **One storage key exists today:** `localStorage["vcfconv-theme"]`, holding `"dark"` or
  `"light"`, written only when the user clicks the theme toggle and read in a `<head>` script
  on every page to avoid a flash of the wrong theme.
- **Contact data is never stored and never transmitted.** It lives in the DOM and in memory
  for the length of the session. When autosave lands (v1.1 P1) it adds a second key holding
  the user's own draft, and **this document plus the privacy page must be updated in the same
  commit** — that is the change that turns a one-line privacy page into a paragraph.
- **Local storage is regulated too.** ePrivacy Directive Art. 5(3) covers "storing
  information, or gaining access to information stored, in the terminal equipment" — cookies
  are an example, not the scope. Consent is required unless the storage is "strictly
  necessary in order for the provider of an information society service explicitly requested
  by the … user to provide the service". A theme preference the user set, and a draft the
  user asked to keep, fall inside that exemption.
- Therefore: **no consent banner**, but the disclosure still has to exist — the exemption
  removes the consent requirement, not the transparency.
- Do not name a data controller that does not exist. Whoever publishes the site supplies that
  identity; leave a clearly marked placeholder until they do.

### Wording to avoid

- "GDPR compliant" — a legal conclusion, not a feature.
- "100% secure", "encrypted" — nothing is encrypted, because nothing is transmitted.
- "We never collect data" — true of contact data, but a storage key exists. Say what is
  stored instead.


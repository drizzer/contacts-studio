# LICENSE-THIRD-PARTY.md — vendored asset register

The project ships no dependencies, but it may vendor *files*: an icon subset, and later a
phone-metadata table. Every vendored file is an exception to "no dependencies" and must be
listed here with its licence and the notice it requires.

Rules:

- A file may be vendored only if its licence permits redistribution and modification, and
  only if the licence text travels with it.
- Local file, lazy loaded where practical, attributed here, with a working fallback in the
  code path that uses it.
- No file may be loaded from a CDN. Vendoring means the bytes are in this repository.
- Record the **exact version** or commit, so the notice can be checked against the source.

## Register

| Asset | Version | Licence | Upstream | Vendored at | Notice needed |
|---|---|---|---|---|---|
| Lucide icons (subset) | _pin at vendoring_ | ISC, plus MIT for Feather-derived icons | https://github.com/lucide-icons/lucide | `assets/icons.svg` (planned) | Full ISC + Feather MIT text, below |
| `libphonenumber-js` metadata | _pin at vendoring_ | MIT | https://github.com/catamphetamine/libphonenumber-js | planned v1.3 | MIT text |

Status 2026-10-21: **nothing is vendored yet.** This file exists first so that the icons
decision (`docs/DECISIONS.md` D-002) cannot land without its notice. When the subset lands,
replace the `_pin at vendoring_` cell with the release tag and verify the text below against
the upstream `LICENSE` file at that tag — upstream's root licence file is the authority, and
it carries the Feather-derived icon list plus the MIT terms.

---

## Lucide

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather
(MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or
without fee is hereby granted, provided that the above copyright notice and this permission
notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL
THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY
DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF
CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE
OR PERFORMANCE OF THIS SOFTWARE.
```

## Feather (icons derived into Lucide)

```
The MIT License (MIT)

Copyright (c) 2013-2022 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

What this means in practice: no visible "Icons by Lucide" credit is required, and no credit
replaces the notice. Keeping this file in the repository is what satisfies the condition, so
**do not delete it, and do not strip the licence comment** from the top of `assets/icons.svg`
when the subset is generated.

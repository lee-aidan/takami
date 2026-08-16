# Mobile Optimization — Progress Tracker

Goal: make the TAKAMI site read cleanly on phones (spacing, text wraps, image
sizing) across the common phone widths, using a mix of static CSS (mobile media
queries) and the existing dynamic JS fitters. Desktop must stay untouched.

Started: 2026-08-16. Owner: paired (Aidan + Claude). Single source of truth for
this effort — update the **Status** column and the **Changelog** as we go.

---

## Test matrix (portrait)

| Device class        | Width | Notes                                  |
|---------------------|-------|----------------------------------------|
| Small (SE1)         | 320   | hardest case; overflow / wrap failures |
| Android small       | 360   |                                        |
| iPhone mini/SE      | 375   | primary baseline                       |
| iPhone 12–15        | 390   |                                        |
| iPhone Pro Max      | 430   |                                        |

Existing breakpoints in `styles.css`: 720, 820, 860, 1024, 1080 px. Phones fall
below all of these, so most mobile CSS should live in a `@media (max-width: 640px)`
(or 560px) block unless a smaller/specific cutoff is needed.

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done & verified · `[!]` blocked/needs input

---

## Findings & plan (prioritized)

### Global / recurring
- `[x]` **G1 — Justified body text rivers** *(High, static)* — DONE (v76).
  Added `@media (max-width:640px)` left-aligning `.page-lead` + `.journey__desc`.
  Verified home + services at 375 and 338; no rivers, no overflow.
- `[ ]` **G2 — Sticky nav over content** *(Med, verify on real device)*
  Mid-scroll the transparent nav can overlap the wordmark. In real use
  `body.scrolled` gives the nav a `--paper` background, hiding content beneath.
  The overlap seen in-preview is a background-tab artifact (`body.scrolled` never
  fires). **Action: confirm on a real phone scroll; if the paper bg lands, close
  as no-op; else force an opaque nav bg under the mobile breakpoint.**
- `[~]` **G3 — Oversized bottom whitespace** *(Low — reassessed)*
  Measured: the home stats→footer gap is ~91px (intro padding + footer's own top
  padding), not a bug; the stats' airy `grid-auto-rows:1fr` rows are the intended
  divider design. Work slideshow gap is likewise section+footer padding.
  **Verdict: acceptable, no change for now.** Revisit only if it reads empty on
  a real device.

### Home (index.html)
- `[x]` **H1 — `.hero__sub` broke into a justified 2-column mess** *(High)* — DONE (v76).
  Un-justified (`text-align:left; text-align-last:auto`), tightened letter-spacing
  + line-height. Now reads as clean left-aligned running text. Verified 375.
- `[x]` **H2 — Hero statement `<br>` forced breaks** *(Med)* — DONE (v76).
  `.hero__statement br{display:none}` + `.hero__lines{width:100%}` on mobile; the
  statement now flows naturally (no orphaned "that"). `.nowrap` preserved.
- `[x]` **H3 — Stats "whitespace"** — reassessed as NOT a bug (see G3). No change.

### Services (services.html)
- `[x]` **S1 — page-lead + journey desc justify** → DONE via **G1** (v76). Verified.
- `[x]` **S2 — Bay Area map tall & faint, spotlight touch-inert** *(Low)* — DONE (v76).
  On mobile: `.difference__map{max-width:15rem}` (smaller) + base `::before`
  opacity 0.26→0.4 so it reads as a deliberate small graphic. *(Verify the shrink
  looks right on a real device — preview can't paint the blend layer.)*
- `[ ]` **S3 — Process/bridge on small screens** *(Low, verify on real device)*
  `fitBridge` sizes the copy to the tower legs; renders OK at 375 but confirm the
  1/3-on-dark-beam alignment and text fit at 320–360 on a real phone.

### Work (work.html)
- `[x]` **W1 — Gap under slideshow** — reassessed as section+footer padding (see G3).
  Slideshow controls + tile look fine on mobile. No change.

### About (about.html)
- `[x]` Stacks cleanly: label over prose, left-aligned, content-width dividers
  carry over correctly. No action. (Spot-check founder portrait/quote — likely fine.)

### Contact (contact.html)
- `[x]` Form stacks to one column, fields + phone placeholder + button all read
  well on mobile. No action.

---

## How to verify in the preview (gotchas)
The preview runs as a **backgrounded tab**, which breaks several things — none are
real bugs, just testing caveats:
- `requestAnimationFrame` is paused → intro flight, count-up, orbit scroll, and
  the journey line-fill don't animate; `IntersectionObserver` reveals don't fire.
  → Force with: `document.querySelectorAll('.reveal').forEach(e=>{e.classList.add('is-visible');e.style.opacity=1;e.style.transform='none'})`.
- `scroll-behavior: smooth` + background tab = `scrollTo` sticks at 0. → Set
  `document.documentElement.style.scrollBehavior='auto'` first.
- Home intro locks scroll; remove `#intro` and clear `html/body { overflow }`.
- `mix-blend-mode` / promoted layers may paint black in the bg tab (services
  process image, difference map) — verify geometry by measurement, not pixels.
- Always confirm `document.documentElement.scrollWidth <= innerWidth` (no
  horizontal overflow) at 320 and 430.

## Conventions
- Put new mobile rules in one clearly-commented `@media (max-width: 640px)` block
  (add narrower overrides only where needed). Never change desktop values.
- Bump `?v=N` on all pages after each CSS/JS change (they share the files):
  `sed -i '' -E 's/styles\.css\?v=[0-9]+/styles.css?v=N/; s/site\.js\?v=[0-9]+/site.js?v=N/' *.html`
- Re-verify at 320 / 375 / 430 after each change.

## Changelog
- 2026-08-16 — Inventory complete across all 5 pages at 375 + 320; findings above.
- 2026-08-16 — v76: added the mobile `@media (max-width:640px)` block —
  G1 (un-justify page-lead/journey desc), H1 (hero__sub un-justify), H2 (hero
  `<br>` off + hero__lines 100%), S2 (map smaller + more opaque). Verified home +
  services at 375 and 338, no horizontal overflow. Not yet committed to git.

## Remaining / open
- **G2** (nav bg) and **S3** (bridge at 320–360) need a real-device foreground
  scroll to confirm — the backgrounded preview can't exercise `body.scrolled`,
  rAF, or blend layers.
- Consider (optional, not yet scoped): per-phrase `nowrap` on `.hero__sub` so the
  4 service phrases never split mid-phrase; a tuned hero image height on very
  short/tall phones; landscape spot-check.

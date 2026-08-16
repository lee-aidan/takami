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
- `[x]` **S3 — Process/bridge on phones** *(v81)* — real-device request: smaller
  copy + the black scroll-bar spine + filled numbers, like desktop.
  - `fitBridge` now bails ≤720px (the wide desktop tower geometry doesn't fit a
    phone), resetting the journey to the centred CSS layout; drawJourney still
    draws the spine + fills numbers on scroll.
  - Mobile CSS (placed *after* the base `.journey` rules so it wins on source
    order): `.journey__desc` → 0.8rem + left-aligned; spine/line → 2px.
  - drawJourney `else` branch now also fills the spine to 100% under reduced
    motion, so the "scroll bar" is present even then.
  - Verified 12.8px desc + 2px spine + no overflow at 375/430.
- `[x]` **S4 — Services orbit now shown on phones** *(v81)* — real-device request
  ("the animated circle is not there"). The orbit is set 640px wide with equal
  negative side margins so the ring + statement sit centre-screen and the side
  strands run off the edges (clipped by `.svc-section { overflow-x: clip }` — the
  fallback marquee is hidden). `alignPeak`/`balanceBottom` bail ≤720px so they
  don't fight the centred layout; `centreStatement` still runs. Verified: ring
  centred at both 375 and 430, statement centred, **no horizontal overflow**.

### Work (work.html)
- `[x]` **W1 — Gap under slideshow** — reassessed as section+footer padding (see G3).
  Slideshow controls + tile look fine on mobile. No change.

### About (about.html)
- `[x]` Stacks cleanly: label over prose, left-aligned, content-width dividers
  carry over correctly.
- `[x]` **A1/C1 — page-lead squished to half width on mobile** *(High)* — DONE (v78).
  Real-device finding (About + Contact): `fitLead` pins the subtext's right edge
  to the title's *last line*; when the title wraps short on a phone, the subtext
  collapsed into a narrow left-hand column. → `fitLead` now bails on
  `max-width:640px`, leaving the lead at `width:auto` (full content width).
  Verified: About/Contact leads span the full 323px content width at 375.

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
- **G2** (nav bg) — CLOSED: real-device screenshots show the nav with the solid
  paper background on scroll; no overlap. Also the bridge (S3) renders well at
  ~390 with black/filled step numbers and left-aligned copy.
- **Open question:** user note "scroll doesn't work as well as the animated word
  lines" (services fallback marquee) — needs clarification on what feels off.
- Consider (optional, not yet scoped): per-phrase `nowrap` on `.hero__sub` so the
  4 service phrases never split mid-phrase; a tuned hero image height on very
  short/tall phones; landscape spot-check.
- 2026-08-16 — v78: fitLead bails on phones so About/Contact page-lead spans full width (was half-width from title-last-line pinning). Real-device pass confirmed earlier v76/77 fixes look good.
- 2026-08-16 — v79-81: mobile Services now matches desktop — animated orbit shown (centred/overflow-clipped), and the process bridge gets smaller copy + a bolder drawn spine + filled numbers (fitBridge skipped on phones). No horizontal overflow at 375/430.
- 2026-08-16 — v82-83: real-device round 2. (1) hero__sub justified so each line fills. (2) page-lead justified on all pages (clean right border to the content edge) + hyphens:auto to tame rivers. (3) bridge descriptions centred under the centred titles. (4) orbit strands switched from rAF+setAttribute to SMIL <animate> (iOS Safari does not repaint textPath startOffset via JS — it looked frozen); speed bumped 16->26. Verified justify/centre/SMIL-elements + no overflow at 375.

# Changelog: index.html and new photos (March 2026)

## Summary
Significant layout and content updates: two-column sections with new photos across the page, Get Involved simplified with activities carousel, inline styles for new components.

---

## Layout and structure

- **Two-column layout**: Introduced `.two-col` / `.two-col--flip` grid (1fr 1fr) with responsive stack at 768px. Used in: Backstory, Venue, Lineup milestone, Tickets, Costs, B&B, Getting There.
- **Inline styles**: New `<style>` block in `<head>` for:
  - `.two-col`, `.two-col__carousel`, `.two-col__bnb`, `.col-photo` (with --square, --landscape, --schedule)
  - `.involve-carousel` (50vh, 35vh on mobile) and `.involve-grid--3col` (3 columns)
  - `.schedule-with-photo` (schedule + photo side-by-side, stacks at 900px)
- **Venue**: Text and pHero carousel in two columns (flip: media right).
- **Backstory**: Text + `DannySquareVietnam.jpg` in two columns.
- **Lineup milestone**: "Buddy up" text + `Celebrating.jpg`.
- **Get Involved**: Replaced role grid with short copy ("All ideas welcome..."), "Add your name" CTA, and **Get Involved carousel** (`#involveCarousel`) cycling through `images/Activities/*` (22 images, 1.2s fade, 3.2s hold). Inline script at bottom of body.
- **Schedule**: "What's happening?" section now has photo column (`whathappening.jpg`) beside schedule dates (`.schedule-with-photo`).
- **Tickets**: Two-column with text + `Tickets.jpg`.
- **Costs**: Costs grid + `AliTent.jpg` in two-column (flip).
- **B&B**: B&B photo (`#pBnbRoom`) and text in two-column; `.two-col__bnb` for aspect ratio.
- **Getting There**: Dist/travel copy + `GettingThere.JPG` in two-column (flip).

---

## New photos added

| File | Section |
|------|--------|
| `images/DannySquareVietnam.jpg` | Backstory |
| `images/Celebrating.jpg` | Lineup milestone |
| `images/whathappening.jpg` | Schedule |
| `images/Tickets.jpg` | Tickets |
| `images/AliTent.jpg` | Costs (camping) |
| `images/GettingThere.JPG` | Getting There |
| `images/Activities/*` (22 images) | Get Involved carousel |

**Activities carousel sequence**: Hats, Tim-Stick, ArgumentBooth, TRex, CowMoon, NoodleWrestling, BDSMGardener, Obscene, EmmaObscene, Chillies, DanJoe2, DanJoe3, Peaches, ViveArt, Shitwife, GameBoy, JackBike, RickCrisps, bbq, bbq2, bbqbarge, bathtub.

---

## Other

- **script.js**: Comment updated (hero-debug-panel reference).
- **hero-debug-panel.js**: Already present in repo; loaded via script tag in index (unchanged).
- Carousel paths: `hats.jpg` → `Hats.jpg`, `TimStick.jpg` → `Tim-Stick.jpg` to match actual filenames in `images/Activities/`.

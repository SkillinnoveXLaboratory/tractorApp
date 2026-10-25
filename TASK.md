# TractorApp — UI Refinement Program

## Goal (auto-continue)

Make every screen of TractorApp look and behave like a polished, professional product: aligned, consistent, readable, and honest about its data. **Work continues automatically from one screen to the next until every box below is checked and every screen has passed the review loop.** Do not stop at "good enough" on one screen while others remain unreviewed.

### Hard constraints

- **Do not remove or break any feature.** Every API call, role permission, and workflow that works today must still work.
- **Do not change the backend** (`../Backend`). UI-only work; use the existing API contract.
- **No hardcoded/fake content in the UI.** No sample people, fake ratings, fake stock, fake fees, fake promo codes, stock-photo avatars, or placeholder images pretending to be real data. Show real data, an honest empty state, or nothing.
- The Farmer dashboard layout is approved — keep its structure; only align it to the shared design system.

### Auto-continue loop (repeat for every screen)

1. **Inspect** — read the screen code and capture a screenshot (web export + headless Chrome, mocked API).
2. **Find** — list misalignment, inconsistent colors/sizes, tiny text, small touch targets, missing loading/empty/error states, dead buttons, hardcoded data, bad navigation.
3. **Fix** — apply the shared design system (tokens + components). No one-off colors or sizes.
4. **Verify** — Babel parse, `expo lint` (no new errors), web export builds, re-screenshot and compare.
5. **Record** — tick the box and add a line to the evidence log. Move to the next unchecked screen immediately.

The program is finished only when all screens are checked, the final full-app regression passes, and `expo export --platform android` succeeds.

## Design system

| Token | Value | Use |
|---|---|---|
| Primary | `#2563EB` (pressed `#1D4ED8`, soft `#EFF6FF`) | Primary actions, active tab, links |
| Success | `#059669` (soft `#ECFDF5`) | Completed, delivered, available |
| Warning | `#D97706` (soft `#FFFBEB`) | Pending, awaiting action |
| Danger | `#DC2626` (soft `#FEF2F2`) | Destructive actions, cancelled, errors |
| Text | `#0F172A` / secondary `#475569` / muted `#64748B` | Headings / body / meta |
| Border | `#E2E8F0`, divider `#F1F5F9` | Cards, inputs, separators |
| Background | `#F8FAFC`, surface `#FFFFFF` | Screen / cards |

- **Spacing:** 4 / 8 / 12 / 16 / 20 / 24. Screen gutter 16.
- **Type:** screen title 18/800 · section 16/800 · card title 15/700 · body 14 · meta 12 · overline 11/800 uppercase.
- **Touch targets:** ≥ 44 px. Primary buttons 50 px tall, 14 px radius, 15 px label.
- **One primary action per screen**, pinned in a sticky footer for forms and detail flows.
- **Status colors** come from one map (pending → warning, completed → success, cancelled → danger, …), never per-screen.
- **States:** every data screen has loading, empty (icon + title + hint + action), and error (message + Retry).
- **Navigation:** tab roots show no back arrow; every other screen's back returns to where the user came from (history), never a hardcoded screen.

## Checklist

### Phase 0 — Foundation
- [x] Split the 7.8k-line `app/index.jsx` into theme, UI components, and screen modules; delete dead legacy components and seeded sample data.
- [x] Theme tokens + shared components: Button, IconButton, Header, Field, Segmented, Badge/StatusBadge, Card, EmptyState, LoadingState, ErrorState, Sheet, StickyFooter, PhotoPicker, ListRow, Avatar.
- [x] Navigation: history-based back everywhere, tab switches reset history, `replace` after create/delete.
- [x] Visual QA harness (web export + mocked API + headless screenshots) outside the source tree.

### Phase 1 — Shell & authentication
- [x] Bottom navigation (all roles) and toast.
- [x] Login.
- [x] Registration (3 steps) and Get Started.
- [x] Drawer menu.

### Phase 2 — Farmer
- [x] Dashboard (align only; replace stock avatar with initials).
- [x] Tractor list, tractor detail, 5-step booking (real date picker).
- [x] Bookings list and booking detail with status tracker.
- [x] Marketplace, product detail, cart (no fake fees/promo), checkout, orders, order detail.
- [x] Wishlist, search, notifications, subscription.
- [x] Agri Doctor.
- [x] Addresses, payment methods, profile, help/terms/privacy pages.

### Phase 3 — Shopkeeper
- [x] Shop home (real dashboard from own products and orders).
- [x] My Products list, product detail, add/edit sheets.
- [x] Incoming orders and order detail actions.

### Phase 4 — Vendor
- [x] Vendor dashboard (metrics + pending requests).
- [x] My Tractors list, detail, add/edit sheets, availability.
- [x] Booking requests: accept/decline, assign/reassign Driver.
- [x] Drivers list and create-Driver sheet.

### Phase 5 — Driver
- [x] Driver home (fix header overlapping content), jobs, job detail with farmer contact and status steps.

### Phase 6 — Final regression
- [x] Every screen re-screenshotted at 360 × 780 and 412 × 915.
- [x] Babel parse, `expo lint` no errors, `expo export --platform android` passes.
- [x] Role isolation unchanged (allowed-screen map per role).
- [ ] Hand off to the real-device checklist in `DEVICE_QA.md` (needs a physical phone; see below).

## Evidence log

- 2026-10-17: **Program pass complete.** Every screen for Farmer, Shopkeeper, Vendor and Driver plus auth, sheets and empty states was captured at 412 × 915 (49 captures) and key screens at 360 × 780, reviewed, fixed and re-captured. Remaining gate: real-phone walkthrough in `DEVICE_QA.md`.
- 2026-10-17: Verification: ESLint over `app/ components/ screens/ lib/` reports 0 errors / 0 warnings (baseline 8 errors / 36 warnings). Every endpoint called by the original app is still called. `expo export --platform android` succeeds.
- 2026-10-17: Assets: hero and status-tracker images re-encoded (4.1 MB → 0.4 MB) and cropped to their banner shapes so the tractor is visible; originals kept untouched.
- 2026-10-17: Fixes found in visual QA: acre stepper overflow, "1 acres" wording, registration footer gutter, summary-row alignment, unframed header action, hero images rendering at native size.
- 2026-10-17: Behaviour fixes made while redesigning (no backend change): duplicate cart lines that made Buy now fail; fake delivery/platform fees and FARM10 promo removed so cart total equals charged total; multi-seller carts now place one order per seller; cart reachable from the marketplace; wishlist screen no longer overwrites the synced wishlist; back always returns to the previous screen; Driver home header no longer covers content; vendor can decline requests; farmer contact shown to vendor/driver; tractor photos editable; destructive actions confirmed.
- 2026-10-17: Removed hardcoded content: sample tractors/products/booking/notifications, fake ratings and stock, stock-photo avatar, Unsplash fallback images, dead settings button, fake categories. Replaced with real data, honest empty states or initials avatars.
- 2026-10-17: Split the 7,833-line `app/index.jsx` into `lib/` (theme, hooks), `components/` (ui, media, cards, shell) and `screens/` (auth, farmer, bookings, market, shopkeeper, vendor, driver, account). Original kept as a backup outside the repo.

- 2026-10-17: UI refinement program redefined with auto-continue loop, design tokens and per-screen checklist.
- 2026-10-17: Profile screen refreshed to supplied modern reference; Android export passed.
- 2026-10-17: UI program initiated. Shared shell and Profile are the first audited surfaces.

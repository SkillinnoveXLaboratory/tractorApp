# TractorApp — Task 2: Role safety, Farmer services, and release hardening

## Goal status: ACTIVE — do not mark production-ready yet

**Completion rule:** Every task must complete the loop below and pass all seven gates before it is marked done. Admin workflows are deliberately out of scope for this task set.

### Standard delivery loop

1. **Plan** — define roles, API contract, data ownership, and screen flow.
2. **Build** — implement backend and app changes together.
3. **Fix** — resolve validation, navigation, responsive-layout, and error-state issues found during review.
4. **Test** — run syntax/static checks and focused API smoke tests.
5. **Pass** — record evidence and only then proceed to the next task.

### Seven recheck gates for every task

1. Role authorization is enforced by the backend, not only hidden in the UI.
2. User input and uploaded files are validated, including empty/error states.
3. Data is persisted, reloaded after sign-in, and scoped to its owner.
4. Loading, success, and failure feedback are clear and non-blocking.
5. Navigation/back behavior has no dead end; active tab is correct.
6. Phone layout is scroll-safe, touch targets align, and primary actions remain visible.
7. Server syntax, JSX parsing, and targeted API flow checks pass.

---

## T2.1 — Correct role model and identity security

**Plan**
- Public registration: Farmer, Shopkeeper, Vendor only.
- Driver accounts are created only by their owning Vendor.
- Shopkeeper alone manages product inventory; Farmers browse, cart, and buy only.
- Persist the JWT securely per signed-in account; remove it fully on logout.

**Build**
- [x] Split public roles from system roles in the backend.
- [x] Add Vendor-owned Driver creation/listing and constrain driver assignment.
- [x] Remove Farmer inventory actions and Driver self-registration from the active app flow.
- [x] Add Vendor Driver management screen.
- [x] Move JWT storage to secure storage and clear all authenticated state on logout.

**Fix / Test / Pass**
- [ ] Complete all seven recheck gates and record the result.

**Current verification:** `node --check` for the server, Babel JSX parsing, and a full Android production export pass (`expo export --platform android`; 1,346 modules bundled). Expo lint still reports legacy/dead-code lint violations in the existing one-file app; this task remains open until those are removed or corrected and a real device/API smoke test passes.

**Live authorization smoke test — 2026-10-17:** Farmer, Shopkeeper, and Vendor registration passed; public Driver registration was rejected (`400`); Farmer Weather and Agri Case reads passed (`200`); Farmer Driver access and product creation were rejected (`403`); Shopkeeper product inventory access passed (`200`). Vendor-created Driver creation, Driver login, and Vendor-only Driver listing all passed (`201`/`200`). An initial `500` was traced to the test client dropping `Content-Type`, not the mobile app helper; the server now also guards an absent request body and returns `400` for invalid JSON after the next deploy.

## T2.2 — Farmer free services: Weather and Agri Doctor

**Plan**
- Farmer dashboard shows location-aware weather from a no-key service through the API.
- Farmers can submit Crop Testing or Soil Testing cases with photos and notes.
- Cases persist with `submitted`, `under_review`, and future `advised` status. Admin advice UI remains out of scope.

**Build**
- [x] Add safe weather endpoint and dashboard card.
- [x] Add Agri Case schema, secure photo upload, Farmer-only APIs, and status timeline.
- [x] Build Farmer Agri Doctor submission/history screen.

**Fix / Test / Pass**
- [ ] Complete all seven recheck gates and record the result.

## T2.3 — Role-scoped navigation and workflow repair

**Plan**
- Each role sees only its own allowed screens/actions.
- Farmer: rent tractors, buy products, bookings, weather, Agri Doctor.
- Shopkeeper: products, incoming shop orders, profile.
- Vendor: tractors, bookings, drivers, profile.
- Driver: assigned work, location/contact, allowed service-status transitions, profile.

**Build**
- [x] Repair Vendor driver-assignment/edit flow and include `on_the_way` in Driver active work.
- [x] Remove obsolete Farmer product links from the active navigation flow.
- [x] Implement controlled back stack and hide bottom navigation on detail/checkout/form flows.
- [x] Make active tabs visibly and accurately blue.

**Fix / Test / Pass**
- [ ] Complete all seven recheck gates and record the result.

## T2.4 — UI consistency and full regression

**Plan**
- Apply a consistent mobile surface hierarchy, typography, spacing, aligned buttons, and clear primary action to all touched screens.

**Build**
- [ ] Polish all new/changed UI states with accessibility-safe contrast and compact phone layout.
- [ ] Eliminate remaining non-production seeded/mocked data from role workflows.

**Fix / Test / Pass**
- [ ] Run every seven-gate check for Farmer, Shopkeeper, Vendor, and Driver.
- [x] Run an end-to-end smoke flow: Vendor → Driver → Farmer booking and Shopkeeper → Farmer order.
- [ ] Record deployment and device verification.

**Live end-to-end regression (2026-10-17):** Vendor created a tractor with an image; Farmer created a booking; Vendor accepted it and assigned its own Driver; Driver signed in and progressed `on_the_way` to `in_progress` to `completed`; Farmer reload showed the final `completed` state and tractor image. Shopkeeper created a product with an image; Farmer placed an order; the order progressed `confirmed` to `packed` to `out_for_delivery` to `delivered`; Farmer reload showed `delivered`.

**Live upload persistence (2026-10-17):** Authenticated Farmer Crop/Soil-case multipart upload returned `201`, retained one image, and remained present after a fresh case-list request. Authenticated Shopkeeper product multipart upload returned `201`, retained one image, and remained present after a fresh inventory-list request.

## Production gate

- [x] Backend deployed and restarted through PM2.
- [x] API health, authentication, uploads, permissions, and persistence verified in production.
- [ ] Android walkthrough completed for every non-Admin role.
- [ ] Only after all above are checked may the app be described as production-level ready.

**Live deployment check — 2026-10-17:** Deployment passed. `GET https://tractor.skillinnovex.in/api/health` returns `release: "role-services-v2"`; `/api/weather`, `/api/drivers`, and `/api/agri-cases` are present and correctly return `401 Authentication token is required` without a JWT. Authenticated role-by-role testing, multipart uploads, owner scoping, and both principal business lifecycles now pass. A real Android role walkthrough and lint cleanup remain mandatory release gates.

**Static audit — 2026-10-17:** `node --check` for the backend and Babel JSX parsing for `app/index.jsx` pass. `expo lint` reports 23 errors and 42 warnings, concentrated in superseded legacy components and duplicate keys in the monolithic `styles` declaration. These must be removed through a controlled component/style split; they are not being masked by disabling lint rules.

**Cleanup progress — 2026-10-17:** Removed five unreferenced legacy placeholder screens and an unused seeded order. Replaced the active Product Detail prop mutation with a local derived value. JSX parsing still passes; lint is now 22 errors and 36 warnings. Remaining errors are concentrated in legacy React-effect/ref patterns and two duplicate style keys.

**Animation cleanup — 2026-10-17:** Reworked the active Farmer booking-status tractor animation to use a stable state-initialized animated value instead of reading a ref during render. Removed the unused legacy drawer. JSX parsing passes and lint is now 15 errors and 33 warnings.

**Drawer cleanup — 2026-10-17:** Reworked the active left-side drawer animation to use a stable state-initialized animated value. JSX parsing passes and lint is now 10 errors and 32 warnings; remaining errors are state-in-effect diagnostics and two duplicate style keys.

**Build verification — 2026-10-17:** A fresh Android production export completed after the cleanup changes (`expo export --platform android`); Metro bundled 1,346 modules and emitted the Hermes Android bundle. This verifies the current app builds, but does not replace the required physical-device walkthrough.

**Expo release health — 2026-10-17:** Updated the Expo SDK 57 patch packages (`expo`, `expo-constants`, `expo-linking`, `expo-router`, and `expo-splash-screen`) using Expo's installer. Removed obsolete `android.edgeToEdgeEnabled` and `newArchEnabled` fields rejected by the SDK 57 config schema. `expo-doctor` now passes all 21 checks.

**Dependency audit — 2026-10-17:** `npm audit --omit=dev` reports 29 transitive build-tool findings. Its offered remediations would downgrade Expo or React Native across major versions, so no unsafe `npm audit fix --force` was applied. The installed Expo 57 / Router 57 / React Native 0.86 dependency tree is internally valid and `expo-doctor` remains fully green.

**Post-update Android export — 2026-10-17:** After the SDK 57 patch upgrades and config cleanup, a fresh Android production export completed successfully. Metro bundled 1,347 modules and emitted the Hermes Android bundle.

**Application identity — 2026-10-17:** Replaced stale KVFNews metadata with `TractorApp`, slug `tractor-app`, and deep-link scheme `tractorapp`. `expo-doctor` remains 21/21 green and Expo config resolves the updated identity.

**Android delivery identity — 2026-10-17:** Added stable Android application ID `in.skillinnovex.tractorapp` for signed Android builds and store delivery. Expo config resolves it successfully and `expo-doctor` remains 21/21 green.

**Safe-area verification — 2026-10-17:** Confirmed the current app imports `SafeAreaView` from `react-native-safe-area-context` (installed at 5.7.0), not the deprecated React Native export that caused the earlier Metro warning.

**Backend release health — 2026-10-17:** Local server syntax check passes and `npm audit --omit=dev` reports zero Backend production vulnerabilities. The live `https://tractor.skillinnovex.in/api/health` endpoint remains healthy on release `role-services-v2`.

**Device gate preparation — 2026-10-17:** Added `DEVICE_QA.md`, a real-phone acceptance checklist covering shared auth/navigation behavior and the complete Farmer, Shopkeeper, Vendor, and Driver flows. This is the remaining evidence required before the app can be described as production-ready.

**Style cleanup — 2026-10-17:** Mechanically formatted `app/index.jsx` with Prettier, then safely merged its duplicate drawer-toggle and onboarding-button style keys while preserving their active runtime values. JSX parsing passes; lint is reduced to 8 errors and 32 warnings, all remaining errors being asynchronous data-loading effect diagnostics.

**Post-format build verification — 2026-10-17:** A fresh Android production export completed after the source formatting and style-key cleanup. Metro bundled 1,347 modules and emitted the Hermes Android bundle successfully.

**Farmer weather cache — 2026-10-17:** Farmer dashboard weather now persists locally per rounded latitude/longitude for one hour. A cached result is displayed immediately on app/dashboard open; the live weather API is called only when no cached entry exists or it is stale. JSX parsing passes and no new lint errors were introduced.

**Android back stack — 2026-10-17:** Added `BackHandler` integration to use the app's navigation history for the phone back button. It closes registration/onboarding to login, returns details/forms to their prior screen, returns navigation roots to Home, and only lets Android close the app at Login or Home. JSX parsing passes.

**Profile visual refresh — 2026-10-17:** Rebuilt the active role-aware Profile screen to match the supplied modern reference: clean summary card, avatar/status indicator, role and contact metadata, blue edit action, grouped icon menus, and outlined red sign-out action. Backend edit/save and role-scoped navigation are retained. JSX parsing and a fresh Android export (1,347 modules) pass.

**Passive-unmount crash fix — 2026-10-17:** Corrected loader effects that were passed directly to `useEffect` and could return Promises as invalid cleanup values. Addresses, Notifications, Payment Methods, Vendor Tractors, Drivers, and Agri Doctor now invoke loaders from explicit effect callbacks. No direct `useEffect(load, ...)` calls remain; JSX parsing and Android export pass.

**UI refinement and lint gate — 2026-10-17:** The monolithic `app/index.jsx` was split into `lib/`, `components/` and `screens/` modules as part of the UI program in `TASK.md`. Legacy dead components and seeded data were removed, and data loading moved to a shared `useResource` hook. ESLint over all app source folders now reports 0 errors and 0 warnings (previously 8 errors and 36 warnings) without disabling any rule. A fresh `expo export --platform android` passes. Backend untouched.

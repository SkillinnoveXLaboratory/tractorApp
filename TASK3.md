# TractorApp — Task 3: Location-aware roles, flow hardening and native UI fixes

## Goal (auto-continue)

Every role's workflow must be correct end to end between the app and `Backend/server.js`, location-aware, enforced by the server per user, free of hardcoded content, and free of native-only UI defects (status bar, keyboard, system navigation bar). **Work continues item by item without stopping until every box is checked and the final dry check passes.** Then the backend is handed over for deployment.

### Hard constraints

- Do not remove any existing feature. Fix flows; never delete capability.
- Rules that protect data or money are enforced by the **server** (role, ownership, status order, distance), not only hidden in the UI.
- No hardcoded data in the app: API URL and subscription plans come from config / the server.
- Existing data keeps working (tractors created before tractor locations existed fall back to the vendor's location).

### Loop for every item

1. **Plan** the server contract and the screen flow.
2. **Build** backend and app together.
3. **Check** — `node --check`, ESLint (0 errors), import/export check, Android export.
4. **Dry run** — exercise the server logic with an in-memory test (no production data touched).
5. **Record** evidence below and move to the next unchecked item.

## Checklist

### A. Location for every role
- [x] After sign-in, every role (Farmer, Shopkeeper, Vendor, Driver) shares its location; denied permission falls back to a manual picker.
- [x] Reusable location picker: "Use current location", search a place by name, preview the selected address.
- [x] Profile shows and edits "My location".

### B. Tractor distance matching (server-enforced)
- [x] Tractors store their own location (picked when adding/editing, defaulting to the vendor's location).
- [x] `GET /api/tractors` for Farmers returns only tractors whose service radius reaches the farmer (distance A→B ≤ tractor radius), sorted nearest first, with `distanceKm`.
- [x] Farmers can search another location or use current location in the tractor list.
- [x] `POST /api/bookings` rejects farms outside the tractor's radius; booking stores farm coordinates and distance.
- [x] Search and dashboard use the same distance rule.

### C. Profile photo
- [x] Upload / replace / remove a profile photo from Profile (server stores it, old file deleted).
- [x] Photo shown on every role's dashboard, drawer and profile; initials when none.

### D. Flow and permission hardening (server)
- [x] Booking status follows a strict per-role order (no reverting completed bookings, no skipping steps).
- [x] Order status follows a strict seller order; cancel only before packing.
- [x] Orders: farmers only, quantities validated, duplicate lines merged, no buying from yourself.
- [x] Booking date must be a valid, non-past date.
- [x] Notifications sent to the other party on every booking/order status change and driver assignment.
- [x] Uploaded file extensions come from the verified image type, not the client file name.
- [x] Startup warns loudly when `JWT_SECRET` is not configured.

### E. Remove hardcoding
- [x] API base URL read from `app.json` → `extra.apiBaseUrl`.
- [x] Subscription plans served by the backend (`GET /api/subscription/plans`).

### F. Native UI defects of the status-bar kind
- [x] Keyboard never covers inputs on Android edge-to-edge (screens, login, registration, sheets).
- [x] Bottom sheets and drawer respect the status bar and system navigation bar insets.
- [x] Status bar icons readable on every screen and overlay.

### G. Final dry check
- [x] Server: syntax check + in-memory API test of every role flow (register → location → tractor → booking → assign → complete; product → order → deliver; avatar).
- [x] App: ESLint 0/0, import/export check, Android export, screenshot pass of changed screens.
- [x] Deployment notes written (env vars, restart, data compatibility).

## Deployment notes (backend)

1. Copy the new `Backend/server.js` to the server (`/home/tractor.skillinnovex.in/public_html`). No new npm packages are needed.
2. **Add `JWT_SECRET` to the server `.env`** — a long random string. Without it the server falls back to a public default secret and now logs a warning at startup. Setting it signs everyone out once; they sign in again.
3. Restart: `pm2 restart tractor-api --update-env`.
4. Check `curl -fsS https://tractor.skillinnovex.in/api/health` shows `"release":"location-roles-v5"` (adds driver and shopkeeper earnings, seller payment verification, and server-served help/terms/privacy pages).
5. Existing data keeps working; the new fields (`avatarUrl`, tractor `location`, booking `farmPoint` / `distanceKm`) are optional.
   **But:** a tractor is shown to farmers only when it has a location. Tractors created before this release use their vendor's saved location; if a vendor never saved one, those tractors stay hidden until the vendor opens the app (location is captured at sign-in) or edits the tractor and sets "Tractor based at".
6. Farmers without a saved location see a "Set your farm location" prompt instead of tractors.
7. Rebuild the app (APK / development build) after the backend is live: `app.json` gained location and camera permissions and `extra.apiBaseUrl`.

## Evidence log

- 2026-10-19: **Task 3 complete, pending the backend deploy and a real-phone pass.**
- 2026-10-19: Backend dry run: 65/65 checks passed against an in-memory MongoDB — registration and roles, tractor location rules, distance filtering including the vendor-location fallback, search, booking range and date checks, full booking and order status orders with skipped/reverted steps rejected, notifications, driver ownership, avatar upload/replace/remove with file cleanup, disguised and non-image uploads, server plans, card-number refusal, cross-vendor isolation, authentication required.
- 2026-10-19: App: ESLint 0 errors / 0 warnings, 19-module import/export check clean, `expo export --platform android` passes, screenshots of every changed screen reviewed.
- 2026-10-19: Native fixes: keyboard avoidance on Android edge-to-edge for all screens and auth; sheets and drawer padded for the status bar and system navigation bar; unused microphone permission removed.
- 2026-10-19: Task 3 defined.

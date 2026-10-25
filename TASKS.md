# TractorApp delivery tasks (Admin excluded)

## Task 1 — Live Farmer rental flow

- [x] Replace seeded tractor browse/detail screens with `/api/tractors` data.
- [x] Replace local five-step booking creation with `POST /api/bookings`.
- [x] Load booking history and tracking from the API.
- [x] Verify empty, loading, error, and successful states through JSX and server syntax checks.

## Task 2 — Vendor operations

- [x] Finish tractor edit/delete and availability management.
- [x] Show incoming booking requests.
- [x] Accept/cancel bookings and assign a registered Driver.
- [x] Verify dashboard totals use only persisted records in the application code.

## Task 3 — Driver operations

- [x] Show assigned jobs, farmer contact details, and service location.
- [x] Allow valid start/complete status transitions.
- [x] Add completed-job history and earnings totals.

## Task 4 — Marketplace and shop orders

- [x] Scope Shopkeeper navigation to its product-management workspace.
- [x] Persist cart checkout, order history, and seller order status updates.
- [x] Add address management and order status timeline from the API.

## Task 5 — Account and platform services

- [x] Replace profile/address/payment/support placeholders with persisted data.
- [x] Add backend notifications and role-scoped notification UI.
- [x] Add wishlist persistence, global API search, subscription records, and terms/privacy content.

## Task 6 — Production hardening

- [ ] Remove remaining seeded data and mock payment labels.
- [ ] Validate role authorization on every API route and screen.
- [ ] Add input validation, image cleanup checks, retry/error states, and API smoke tests.
- [ ] Run Android regression checks across Farmer, Shopkeeper, Vendor, and Driver.

## Task 7 — Deployment verification

- [x] Deploy backend changes and restart PM2.
- [x] Check `/api/health`, HTTPS uploads, database records, and production API base URL.
- [x] Test clean registration/login for every non-Admin role.

Verified in production on 2026-10-16: Farmer, Vendor, Driver, and Shopkeeper registration/login; Farmer address/payment/subscription persistence; Vendor multipart tractor upload; live rental transition `pending → accepted → assigned → in_progress → completed`; Shopkeeper product upload; marketplace order transition `placed → confirmed → packed → out_for_delivery → delivered`.

### Production verification commands

```bash
cd /home/tractor.skillinnovex.in/public_html
npm install --omit=dev
node --check server.js
pm2 restart tractor-api --update-env
curl -fsS https://tractor.skillinnovex.in/api/health
pm2 logs tractor-api --lines 50
```

### Manual role smoke test

1. Register Farmer, Vendor, Driver, and Shopkeeper accounts.
2. Vendor adds a tractor; Farmer sees it, creates a booking, and Vendor accepts it.
3. Vendor assigns the Driver; Driver starts and completes the job.
4. Farmer and Shopkeeper create products; place and progress one marketplace order.
5. Verify addresses, wishlist, profile, notifications, search, and subscriptions persist after sign-out/sign-in.

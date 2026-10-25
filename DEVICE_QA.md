# TractorApp Android device acceptance checklist

Run this against the live API (`https://tractor.skillinnovex.in/api`) in Expo Go or a signed Android build. Mark each item only after observing it on a real phone.

## Shared checks

- [ ] Fresh launch shows the login screen within the safe area, with no content hidden behind system UI.
- [ ] Registration offers Farmer, Shopkeeper, and Vendor only; Driver is not publicly selectable.
- [ ] Sign-in restores the correct role and its role-specific bottom navigation.
- [ ] Sign-out returns to login and a subsequent launch does not restore the signed-out session.
- [ ] Back navigation closes detail/form flows and returns to the expected parent screen.
- [ ] No red error overlay, invalid icon, raw text rendering, or horizontal overflow occurs.

## Farmer

- [ ] Permit location; verify the readable location and weather card on Dashboard.
- [ ] Browse tractor list, open a detail, and complete all five booking steps.
- [ ] Verify the accepted booking shows the tractor thumbnail and animated status tracker.
- [ ] Browse marketplace, add products from two different Shopkeepers to cart, and confirm checkout places one order per seller.
- [ ] Open Agri Doctor, attach image(s), submit a Crop or Soil case, and confirm it remains after reload.

## Shopkeeper

- [ ] Dashboard exposes only Shop, Products, Orders, and Profile navigation.
- [ ] Add a product with multiple photos; verify it appears after reload.
- [ ] Open product details, edit text and images, then delete a test product.
- [ ] Verify incoming Farmer orders show image, amount, and valid order status changes.

## Vendor

- [ ] Dashboard exposes only Home, Tractors, Drivers, Bookings, and Profile navigation.
- [ ] Add a tractor with an image, service radius, and per-acre price; verify it remains after reload.
- [ ] Change tractor availability and verify the Farmer cannot book unavailable equipment.
- [ ] Create a Driver account and confirm it appears only in this Vendor's Driver list.
- [ ] Accept a booking, assign/reassign an owned Driver, and verify the Farmer sees the update.

## Driver

- [ ] Sign in using a Vendor-created Driver account; no public Driver registration route is visible.
- [ ] Verify only assigned work is listed.
- [ ] Move a booking through `on_the_way`, `in_progress`, and `completed`.
- [ ] Confirm the Farmer booking tracker reflects each state after refresh.

## Location, photos and distance (Task 3)

- [ ] After signing in as each role, Android asks for location once; Profile shows the detected place.
- [ ] Deny location: the Farmer dashboard shows "Set your farm location", and setting it by searching a town works.
- [ ] Vendor adds a tractor with "Tractor based at" set and a 10 km radius; a Farmer more than 10 km away does not see it, a Farmer within 10 km does, with "X km away".
- [ ] Tractor list → Change → search another town shows that area's tractors; Reset returns to your own location.
- [ ] Booking a farm outside the radius is blocked in the app, with the distance shown.
- [ ] Driver / Vendor booking detail: "Navigate to farm" opens the maps app at the farm pin.
- [ ] Profile → tap the photo → choose from gallery or take a photo; it appears on the dashboard and drawer; Remove returns to initials.
- [ ] The keyboard never hides the field being typed in (login, registration, booking notes, sheets).
- [ ] Sheet buttons are not hidden behind the phone's navigation bar (3-button and gesture modes).

## Final evidence

- [ ] Capture one screenshot each for Farmer, Shopkeeper, Vendor, and Driver dashboards.
- [ ] Record device model, Android version, Expo Go/build version, and test date in `TASK2.md`.

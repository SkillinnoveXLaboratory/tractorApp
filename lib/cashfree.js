// Web build: Cashfree's native SDK isn't available, so the Premium screen uses the hosted checkout page.
// Phones load lib/cashfree.native.js instead.
export const inAppCheckoutAvailable = false;

export function payInApp() {
  return Promise.resolve({ ok: false, message: "In-app checkout is only available in the mobile app." });
}

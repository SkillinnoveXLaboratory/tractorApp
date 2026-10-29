import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "./api";
import { inAppCheckoutAvailable, payInApp } from "./cashfree";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Where Cashfree's hosted page sends the browser back to (fallback when the in-app SDK isn't built in).
export const payReturnUrl = (path) => Linking.createURL(path);

// Runs an online payment the server already created (booking or order) and asks the server to confirm it.
// The phone's result is never trusted: the server checks with Cashfree. Returns the server's verify answer
// ({ status, message, booking | order }).
export async function completeOnlinePayment({ token, checkout, returnUrl }) {
  if (inAppCheckoutAvailable && checkout.paymentSessionId) {
    await payInApp({ sessionId: checkout.paymentSessionId, orderId: checkout.orderId, environment: checkout.environment });
  } else {
    await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, returnUrl);
  }
  const verify = () => apiRequest("/collections/verify", { method: "POST", token, body: { orderId: checkout.orderId } });
  let result = await verify();
  // A payment that is still settling gets one more check.
  if (result.status === "created") {
    await wait(2500);
    result = await verify();
  }
  return result;
}

export const paymentMessage = (result) =>
  result.status === "created" ? "Payment not completed. If money was taken, it's confirmed automatically in a few minutes." : result.message;

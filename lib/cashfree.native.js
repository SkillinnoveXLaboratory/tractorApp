import { NativeModules, Platform } from "react-native";

// Cashfree's native checkout ships in development and store builds. Expo Go and web don't include it,
// so the app falls back to the hosted checkout page in a browser tab there.
export const inAppCheckoutAvailable = Platform.OS !== "web" && !!NativeModules.CashfreePgApi;

// Opens Cashfree's in-app payment sheet (UPI apps, cards, net banking, wallets) for an order the server created.
// Resolves { ok: true } when Cashfree says the payment can be verified, or { ok: false, message } when it
// failed or the user backed out. Either way the server is asked to verify; this result only guides the UI.
export function payInApp({ sessionId, orderId, environment }) {
  // Loaded lazily: the SDK touches native modules as soon as it is imported.
  const { CFPaymentGatewayService } = require("react-native-cashfree-pg-sdk");
  const { CFDropCheckoutPayment, CFEnvironment, CFSession, CFThemeBuilder } = require("cashfree-pg-api-contract");
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      CFPaymentGatewayService.removeCallback();
      resolve(result);
    };
    CFPaymentGatewayService.setCallback({
      onVerify: (id) => finish({ ok: true, orderId: id }),
      onError: (error, id) => finish({ ok: false, orderId: id, message: error?.getMessage?.() || "The payment was not completed." }),
    });
    try {
      const session = new CFSession(sessionId, orderId, environment === "PRODUCTION" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX);
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor("#1E1B4B")
        .setNavigationBarTextColor("#FFFFFF")
        .setButtonBackgroundColor("#4338CA")
        .setButtonTextColor("#FFFFFF")
        .setPrimaryTextColor("#0F172A")
        .setSecondaryTextColor("#64748B")
        .setBackgroundColor("#FFFFFF")
        .build();
      CFPaymentGatewayService.doPayment(new CFDropCheckoutPayment(session, null, theme));
    } catch (error) {
      finish({ ok: false, orderId, message: error?.message || "Couldn’t open the payment screen." });
    }
  });
}

import { fetch as expoFetch } from "expo/fetch";
import Constants from "expo-constants";

// Configured in app.json → expo.extra.apiBaseUrl so each build can point at its own server.
const API_BASE_URL = String(Constants.expoConfig?.extra?.apiBaseUrl || "").replace(/\/+$/, "");

let onSessionEnded = null;
let onPaywall = null;
// app/index.jsx registers this so a 402 (subscription needed) anywhere refreshes access and opens Premium.
export function setPaywallHandler(handler) {
  onPaywall = handler;
}
// app/index.jsx registers this so an ended session anywhere in the app signs the user out.
export function setSessionEndedHandler(handler) {
  onSessionEnded = handler;
}

async function send(path, options, fallbackMessage) {
  if (!API_BASE_URL) throw new Error("The app is missing its server address (expo.extra.apiBaseUrl).");
  let response;
  try {
    response = await expoFetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error("Can't reach the server. Check your internet connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || fallbackMessage);
    error.status = response.status;
    error.code = data.code;
    if (response.status === 401 && options.headers?.Authorization && onSessionEnded) onSessionEnded(error);
    if (response.status === 402 && data.code === "SUBSCRIPTION_REQUIRED" && onPaywall) onPaywall(error);
    throw error;
  }
  return data;
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  // Expo's native FormData may not pass an instanceof check across runtimes.
  const isFormData = !!body && typeof body.append === "function" && typeof body !== "string";
  return send(
    path,
    {
      method,
      headers: {
        ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    },
    "Unable to complete the request.",
  );
}

export async function authRequest(path, body) {
  return send(
    path,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    "Unable to complete the request.",
  );
}

export async function getCurrentUser(token) {
  return send(`/auth/me`, { headers: { Authorization: `Bearer ${token}` } }, "Unable to load your account.");
}

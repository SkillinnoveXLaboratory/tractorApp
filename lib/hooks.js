import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "tractor_session";
const ROLE_KEYS = ["farmer", "shopkeeper", "vendor", "driver"].map((role) => `tractor_jwt_${role}`);

// Device-local state (cart, wishlist cache). Writes only after the stored value is read,
// so the initial value never overwrites what was saved.
export function useStored(key, initial) {
  const [value, setValue] = useState(initial);
  const hydrated = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (active && raw != null) setValue(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value]);
  return [value, setValue];
}

// Signed-in session (JWT + user) kept in the device keychain.
export function useSecureSession() {
  const [value, setValue] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        let raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (!raw) {
          // One-time migration from the earlier AsyncStorage session.
          raw = await AsyncStorage.getItem("agri_session");
          if (raw) {
            await SecureStore.setItemAsync(SESSION_KEY, raw);
            await AsyncStorage.removeItem("agri_session");
          }
        }
        if (raw) setValue(JSON.parse(raw));
      } catch {
        // No stored session or keychain unavailable: start signed out.
      } finally {
        setReady(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        if (value?.token && value?.user?.role) {
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(value));
          await SecureStore.setItemAsync(`tractor_jwt_${value.user.role}`, value.token);
        } else {
          await SecureStore.deleteItemAsync(SESSION_KEY);
          for (const key of ROLE_KEYS) await SecureStore.deleteItemAsync(key);
          await AsyncStorage.removeItem("agri_session");
        }
      } catch {
        // Persisting is best effort; the in-memory session still works.
      }
    })();
  }, [value, ready]);
  return [value, setValue, ready];
}

// Loads remote data with loading/error state. `key` re-runs the request when it changes;
// `reload()` refreshes on demand (pull to refresh, Retry buttons).
export function useResource(key, load, initialData = null) {
  const [state, setState] = useState({ data: initialData, loading: true, error: "" });
  const [nonce, setNonce] = useState(0);
  const run = useEffectEvent(() => load());
  useEffect(() => {
    let active = true;
    Promise.resolve(run())
      .then((data) => {
        if (active) setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (active)
          setState((current) => ({
            ...current,
            loading: false,
            error: error?.message || "Something went wrong. Please try again.",
          }));
      });
    return () => {
      active = false;
    };
  }, [key, nonce]);
  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setNonce((n) => n + 1);
  }, []);
  const setData = useCallback(
    (updater) =>
      setState((current) => ({
        ...current,
        data: typeof updater === "function" ? updater(current.data) : updater,
      })),
    [],
  );
  return { ...state, reload, setData };
}

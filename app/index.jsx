import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppState, BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { apiRequest, getCurrentUser, setPaywallHandler, setSessionEndedHandler } from "../lib/api";
import { currentPlace } from "../lib/location";
import { useSecureSession, useStored } from "../lib/hooks";
import { colors } from "../lib/theme";
import { ALLOWED, BottomNav, isTabRoot, NEVER_LOCKED, Toast } from "../components/shell";
import { LockContext } from "../components/ui";
import { PremiumBanner, PremiumGate } from "../components/premium";
import { AppSplash } from "../components/splash";
import { GetStarted, Login, Register } from "../screens/auth";
import { AgriAdvice, BookTractor, FarmerHome, TractorDetail, TractorList } from "../screens/farmer";
import { BookingDetail, Bookings } from "../screens/bookings";
import { Cart, Checkout, GlobalSearch, MarketplaceShop, OrderDetail, Orders, ProductDetail, Wishlist } from "../screens/market";
import { MyProductDetail, MyProducts, ShopEarnings, ShopHome } from "../screens/shopkeeper";
import { VendorDrivers, VendorHome, VendorTractorDetail, VendorTractors } from "../screens/vendor";
import { DriverEarnings, DriverHome } from "../screens/driver";
import { Addresses, EditProfile, InfoPage, Notifications, PaymentMethods, Profile, Subscription } from "../screens/account";
import { Payouts } from "../screens/payouts";

const EMPTY_WISH = { products: [], tractors: [] };

export default function App() {
  const [session, setSession, sessionReady] = useSecureSession();
  // Animated launch screen, shown over whatever loads first until the saved session is read.
  const [splashDone, setSplashDone] = useState(false);
  const splash = splashDone ? null : <AppSplash ready={sessionReady} onDone={() => setSplashDone(true)} />;
  // Every state renders inside the same full-screen shell with the splash as its last child, so the splash covers
  // the whole display (behind the status and navigation bars, like the native splash) and keeps running while the
  // app behind it switches from loading to signed in/out.
  const shell = (body) => (
    <View style={styles.shell}>
      {body}
      {splash}
    </View>
  );
  const [cart, setCart] = useStored("agri_cart", []);
  const [wish, setWish] = useStored("agri_wish", EMPTY_WISH);
  const [screen, setScreen] = useState("home"),
    [selected, setSelected] = useState(null),
    [history, setHistory] = useState([]),
    [toast, setToast] = useState(""),
    [registering, setRegistering] = useState(false),
    [pendingSession, setPendingSession] = useState(null);
  const toastTimer = useRef(null);
  const wishHydrated = useRef(false);
  const role = session?.user?.role || "farmer";
  const token = session?.token;
  // Vendors and shopkeepers need an active subscription; the server decides (GET /auth/me → access).
  const [access, setAccess] = useState(null);
  const locked = !!access?.locked && (role === "vendor" || role === "shopkeeper");
  // "Upgrade to continue" pops up each time a locked vendor/shopkeeper opens the app; "Not now" hides it until next launch.
  const [gateDismissed, setGateDismissed] = useState(false);
  const [fromPrice, setFromPrice] = useState(null);
  useEffect(() => {
    if (!locked || !token) return undefined;
    let active = true;
    apiRequest("/subscription/plans", { token })
      .then((data) => { if (active) setFromPrice(Math.min(...(data.plans || []).map((plan) => plan.perMonth)) || null); })
      .catch(() => {});
    return () => { active = false; };
  }, [locked, token]);

  // Refresh the signed-in account from the server (photo, location, name); an expired token signs out.
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    getCurrentUser(token)
      .then((result) => {
        if (active && result.user) setSession((current) => (current ? { ...current, user: { ...current.user, ...result.user } } : current));
        if (active) setAccess(result.access || null);
      })
      .catch((error) => {
        // 401 is handled by the session-ended handler; 404 means the account no longer exists (e.g. after a data reset).
        if (active && error.status === 404) setSession(null);
      });
    return () => {
      active = false;
    };
  }, [token, setSession]);

  // Every role shares its location after sign-in, unless the user chose one by hand.
  const manualLocation = !!session?.locationManual;
  useEffect(() => {
    if (!token || manualLocation) return undefined;
    let active = true;
    currentPlace()
      .then((place) => apiRequest("/auth/location", { method: "PUT", token, body: place }))
      .then((result) => {
        if (active && result.user) setSession((current) => (current ? { ...current, user: { ...current.user, ...result.user } } : current));
      })
      .catch(() => {
        // Permission denied or offline: screens that need a location offer the picker instead.
      });
    return () => {
      active = false;
    };
  }, [token, manualLocation, setSession]);

  // Saves a location picked in the app. `manual` stops the next launch replacing it with GPS.
  const saveLocation = async (place, { manual = true } = {}) => {
    const result = await apiRequest("/auth/location", {
      method: "PUT",
      token,
      body: { latitude: place.latitude, longitude: place.longitude, address: place.address || "" },
    });
    setSession((current) => (current ? { ...current, locationManual: manual, user: { ...current.user, ...result.user } } : current));
    return result.user?.location;
  };

  // Wishlist lives on the server; the local copy is a cache that is synced after the first load.
  useEffect(() => {
    wishHydrated.current = false;
    if (!token) return;
    apiRequest("/wishlist", { token })
      .then((result) => setWish(result.wishlist || EMPTY_WISH))
      .catch(() => {})
      .finally(() => {
        wishHydrated.current = true;
      });
  }, [token, setWish]);
  useEffect(() => {
    if (!wishHydrated.current || !token) return;
    apiRequest("/wishlist", { method: "PUT", token, body: wish }).catch(() => {});
  }, [wish, token]);

  const notify = (message, duration = 2400) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), duration);
  };

  // The server ended this session (account suspended, password reset, or "sign out everywhere"):
  // clear the app and say why. Cart and wishlist stay for the next sign-in.
  const endSession = useEffectEvent((error) => {
    if (!session) return;
    setSession(null);
    setHistory([]);
    setSelected(null);
    setScreen("home");
    notify(error.code === "ACCOUNT_SUSPENDED" ? error.message : "Your session ended. Please sign in again.", 5000);
  });
  // Re-check access when the app comes back to the foreground (a plan may have expired or been paid).
  const refreshAccess = useEffectEvent(() => {
    if (!token) return;
    getCurrentUser(token).then((result) => setAccess(result.access || null)).catch(() => {});
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshAccess();
    });
    return () => sub.remove();
  }, []);
  const paywall = useEffectEvent((error) => {
    refreshAccess();
    // Same as go("subscription"), which is declared further down.
    if (screen !== "subscription") {
      setHistory((current) => [...current, { screen, selected }]);
      setSelected(null);
      setScreen("subscription");
    }
    notify(error.message, 4000);
  });
  useEffect(() => {
    setPaywallHandler((error) => paywall(error));
    return () => setPaywallHandler(null);
  }, []);
  useEffect(() => {
    setSessionEndedHandler((error) => endSession(error));
    return () => setSessionEndedHandler(null);
  }, []);

  // Tab destinations start a fresh history; everything else is pushed so Back returns to it.
  const go = (next, data = null) => {
    if (isTabRoot(role, next)) setHistory([]);
    else if (next !== screen || data !== selected) setHistory((current) => [...current, { screen, selected }]);
    setSelected(data);
    setScreen(next);
  };
  // Swap the current screen without adding a history entry (after create/submit).
  const replace = (next, data = null) => {
    setSelected(data);
    setScreen(next);
  };
  const back = () => {
    const previous = history[history.length - 1];
    if (!previous) {
      setSelected(null);
      setScreen("home");
      return;
    }
    setHistory((current) => current.slice(0, -1));
    setSelected(previous.selected);
    setScreen(previous.screen);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!session) {
        if (registering === "payouts") {
          setRegistering("success");
          return true;
        }
        if (registering) {
          setRegistering(false);
          return true;
        }
        return false;
      }
      const previous = history[history.length - 1];
      if (previous) {
        setHistory((current) => current.slice(0, -1));
        setSelected(previous.selected);
        setScreen(previous.screen);
        return true;
      }
      if (screen !== "home") {
        setSelected(null);
        setScreen("home");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [session, screen, history, registering]);

  const signOut = () => {
    setSession(null);
    setAccess(null);
    setGateDismissed(false);
    setCart([]);
    setWish(EMPTY_WISH);
    setHistory([]);
    setSelected(null);
    setScreen("home");
    setRegistering(false);
    notify("You have been signed out.");
  };

  if (!sessionReady)
    return shell(
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
      </SafeAreaView>,
    );

  if (!session)
    return shell(
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        {registering === "payouts" ? (
          // Sign-up step 2 for vendors and shopkeepers: where online payments are settled (skippable).
          <Payouts
            onboarding
            token={pendingSession?.token}
            user={pendingSession?.user}
            notify={notify}
            onDone={() => setRegistering("success")}
            onSkip={() => setRegistering("success")}
          />
        ) : registering === "success" ? (
          <GetStarted
            user={pendingSession?.user}
            onDashboard={() => {
              setSession(pendingSession);
              setRegistering(false);
              setHistory([]);
              setScreen("home");
            }}
          />
        ) : registering ? (
          <Register
            onComplete={(result) => {
              setPendingSession(result);
              setRegistering(["vendor", "shopkeeper"].includes(result?.user?.role) ? "payouts" : "success");
            }}
            onBack={() => setRegistering(false)}
          />
        ) : (
          <Login
            onSuccess={(result) => {
              setHistory([]);
              setSelected(null);
              setScreen("home");
              setSession(result);
            }}
            onRegister={() => setRegistering(true)}
          />
        )}
        <Toast message={toast} />
      </SafeAreaView>,
    );

  const safeScreen = (ALLOWED[role] || ALLOWED.farmer).includes(screen) ? screen : "home";
  const tab = isTabRoot(role, safeScreen);
  const props = {
    go,
    back,
    replace,
    signOut,
    setSession,
    saveLocation,
    user: session.user,
    token,
    cart,
    setCart,
    wish,
    setWish,
    notify,
    isTab: tab,
    access,
    setAccess,
    locked,
    upgrade: () => go("subscription"),
  };
  const lockValue = locked && !NEVER_LOCKED.includes(safeScreen) ? { onLocked: () => go("subscription") } : null;
  const key = `${safeScreen}:${selected?._id || selected?.id || (typeof selected === "string" ? selected : "")}`;
  return shell(
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {locked && safeScreen !== "subscription" ? <PremiumBanner role={role} access={access} onPress={() => go("subscription")} /> : null}
        <PremiumGate
          visible={splashDone && locked && !gateDismissed && safeScreen !== "subscription"}
          role={role}
          access={access}
          fromPrice={Number.isFinite(fromPrice) ? fromPrice : null}
          onUpgrade={() => { setGateDismissed(true); go("subscription"); }}
          onClose={() => setGateDismissed(true)}
        />
        <LockContext.Provider value={lockValue}>
          <ScreenFor key={key} name={safeScreen} role={role} selected={selected} props={props} />
        </LockContext.Provider>
        <Toast message={toast} aboveNav={tab} />
        {tab ? <BottomNav role={role} screen={safeScreen} go={go} locked={locked} cartCount={cart.reduce((sum, line) => sum + line.qty, 0)} /> : null}
      </View>
    </SafeAreaView>,
  );
}

function ScreenFor({ name, role, selected, props: p }) {
  switch (name) {
    case "home":
      if (role === "vendor") return <VendorHome {...p} />;
      if (role === "shopkeeper") return <ShopHome {...p} />;
      if (role === "driver") return <DriverHome {...p} />;
      return <FarmerHome {...p} />;
    case "tractors":
      return role === "vendor" ? <VendorTractors {...p} /> : <TractorList {...p} />;
    case "tractor":
      return <TractorDetail {...p} tractor={selected} />;
    case "booking":
      return <BookTractor {...p} tractor={selected} />;
    case "bookings":
      return <Bookings {...p} />;
    case "bookingDetail":
      return <BookingDetail {...p} booking={selected} />;
    case "shop":
      return <MarketplaceShop {...p} />;
    case "product":
      return <ProductDetail {...p} product={selected} />;
    case "cart":
      return <Cart {...p} />;
    case "checkout":
      return <Checkout {...p} />;
    case "orders":
      return <Orders {...p} />;
    case "orderDetail":
      return <OrderDetail {...p} order={selected} />;
    case "notifications":
      return <Notifications {...p} />;
    case "subscription":
      return <Subscription {...p} />;
    case "wishlist":
      return <Wishlist {...p} />;
    case "profile":
      return <Profile {...p} />;
    case "earnings":
      return role === "shopkeeper" ? <ShopEarnings {...p} /> : <DriverEarnings {...p} />;
    case "editProfile":
      return <EditProfile {...p} />;
    case "addresses":
      return <Addresses {...p} />;
    case "paymentMethods":
      return <PaymentMethods {...p} />;
    case "payouts":
      return <Payouts {...p} />;
    case "search":
      return <GlobalSearch {...p} />;
    case "info":
      return <InfoPage {...p} item={selected} />;
    case "agriAdvice":
      return <AgriAdvice {...p} />;
    case "myProducts":
      return <MyProducts {...p} />;
    case "myProductDetail":
      return <MyProductDetail {...p} product={selected} />;
    case "vendorTractorDetail":
      return <VendorTractorDetail {...p} tractor={selected} />;
    case "drivers":
      return <VendorDrivers {...p} />;
    default:
      return <FarmerHome {...p} />;
  }
}

const styles = StyleSheet.create({
  // White behind the phone's status bar and gesture area so they blend with headers and the tab bar.
  shell: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.surface },
  app: { flex: 1, backgroundColor: colors.background },
});

import React, { useEffect, useState } from "react";
import { Animated, Modal, Pressable, StatusBar as NativeStatusBar, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, NAV_HEIGHT, radius, roleLabel, shadow, space, type } from "../lib/theme";
import { Avatar, Icon, useLock } from "./ui";

// Bottom-tab destinations per role. Tab roots never show a back arrow.
export const TABS = {
  farmer: [
    ["home", "home", "Home"],
    ["tractors", "construct", "Tractors"],
    ["shop", "storefront", "Shop"],
    ["bookings", "calendar", "Bookings"],
    ["profile", "person", "Profile"],
  ],
  shopkeeper: [
    ["home", "storefront", "Shop"],
    ["myProducts", "pricetags", "Products"],
    ["orders", "cube", "Orders"],
    ["earnings", "wallet", "Earnings"],
    ["profile", "person", "Profile"],
  ],
  vendor: [
    ["home", "home", "Home"],
    ["tractors", "construct", "Tractors"],
    ["drivers", "people", "Drivers"],
    ["bookings", "calendar", "Bookings"],
    ["profile", "person", "Profile"],
  ],
  driver: [
    ["home", "home", "Home"],
    ["bookings", "car", "Jobs"],
    ["earnings", "wallet", "Earnings"],
    ["profile", "person", "Profile"],
  ],
};

// Screens each role may open. Anything else falls back to Home.
export const ALLOWED = {
  farmer: [
    "home", "tractors", "tractor", "booking", "bookings", "bookingDetail", "shop", "product",
    "cart", "checkout", "orders", "orderDetail", "notifications", "wishlist",
    "profile", "editProfile", "addresses", "paymentMethods", "search", "info", "agriAdvice",
  ],
  shopkeeper: ["home", "myProducts", "myProductDetail", "orders", "orderDetail", "earnings", "notifications", "subscription", "profile", "editProfile", "info"],
  vendor: [
    "home", "tractors", "vendorTractorDetail", "bookings", "bookingDetail", "drivers",
    "notifications", "subscription", "profile", "editProfile", "info",
  ],
  driver: ["home", "bookings", "bookingDetail", "earnings", "notifications", "profile", "editProfile", "info"],
};

// Screens a vendor/shopkeeper can still use without an active subscription; everything else is locked.
export const OPEN_WHEN_LOCKED = ["home", "profile", "editProfile", "subscription", "info", "notifications"];
// Screens that never get the lock (they hold the way to pay, account settings and help).
export const NEVER_LOCKED = ["profile", "editProfile", "subscription", "info", "notifications"];

// Floating action buttons sit just above the bottom navigation.
export const NAV_FAB_OFFSET = NAV_HEIGHT + space.lg;

export const isTabRoot =(role, screen) => (TABS[role] || TABS.farmer).some(([key]) => key === screen);

// `locked`: tabs other than Home and Profile show a lock and open the subscription screen.
export function BottomNav({ role, screen, go, cartCount, locked = false }) {
  const items = TABS[role] || TABS.farmer;
  return (
    <View style={styles.nav}>
      {items.map(([key, icon, label]) => {
        const active = screen === key;
        const tabLocked = locked && !OPEN_WHEN_LOCKED.includes(key);
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={tabLocked ? `${label}, locked` : label}
            accessibilityState={{ selected: active }}
            onPress={() => go(tabLocked ? "subscription" : key)}
            style={styles.navSlot}
          >
            <View style={[styles.navPill, active && styles.navPillActive]}>
              <Icon name={active ? icon : `${icon}-outline`} size={20} color={active ? colors.white : colors.muted} />
              {tabLocked ? (
                <View style={styles.navLock}>
                  <Icon name="lock-closed" size={9} color={colors.white} />
                </View>
              ) : null}
              {active ? (
                <Text style={styles.navLabel} numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
              {key === "shop" && cartCount > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const DRAWER_LINKS = {
  farmer: [
    ["home", "home-outline", "Dashboard"],
    ["tractors", "construct-outline", "Book a Tractor"],
    ["shop", "storefront-outline", "Marketplace"],
    ["bookings", "calendar-outline", "My Bookings"],
    ["orders", "cube-outline", "My Orders"],
    ["agriAdvice", "medkit-outline", "Agri Doctor"],
    ["wishlist", "heart-outline", "Wishlist"],
    ["notifications", "notifications-outline", "Notifications"],
    ["profile", "person-outline", "Profile"],
  ],
  vendor: [
    ["home", "home-outline", "Dashboard"],
    ["tractors", "construct-outline", "My Tractors"],
    ["bookings", "calendar-outline", "Bookings"],
    ["drivers", "people-outline", "Drivers"],
    ["subscription", "diamond-outline", "Premium"],
    ["notifications", "notifications-outline", "Notifications"],
    ["profile", "person-outline", "Profile"],
  ],
  shopkeeper: [
    ["home", "storefront-outline", "My Shop"],
    ["myProducts", "pricetags-outline", "My Products"],
    ["orders", "cube-outline", "Orders"],
    ["earnings", "wallet-outline", "Earnings"],
    ["subscription", "diamond-outline", "Premium"],
    ["notifications", "notifications-outline", "Notifications"],
    ["profile", "person-outline", "Profile"],
  ],
  driver: [
    ["home", "home-outline", "Dashboard"],
    ["bookings", "car-outline", "My Jobs"],
    ["earnings", "wallet-outline", "Earnings"],
    ["notifications", "notifications-outline", "Notifications"],
    ["profile", "person-outline", "Profile"],
  ],
};

export function DrawerMenu({ visible, onClose, user, go, signOut, current = "home" }) {
  const [slide] = useState(() => new Animated.Value(-320));
  const insets = useSafeAreaInsets();
  // Inside a modal the safe-area inset can read 0 on Android, so also use the real status bar height.
  const topInset = Math.max(insets.top, NativeStatusBar.currentHeight || 0);
  const role = user?.role || "farmer";
  const links = DRAWER_LINKS[role] || DRAWER_LINKS.farmer;
  const lock = useLock();
  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 0 : -320, duration: 220, useNativeDriver: true }).start();
  }, [visible, slide]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {visible ? <StatusBar style="light" /> : null}
      <View style={styles.drawerOverlay}>
        <Animated.View
          style={[styles.drawer, { paddingTop: topInset + space.xxl + space.sm, paddingBottom: insets.bottom + space.xl, transform: [{ translateX: slide }] }]}
        >
          <View style={styles.drawerHead}>
            <Avatar name={user?.fullName} uri={user?.avatarUrl} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle} numberOfLines={1}>
                {user?.fullName || "Your account"}
              </Text>
              <Text style={type.meta} numberOfLines={1}>
                {roleLabel(role)} account
              </Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            {links.map(([screen, icon, text]) => {
              const active = screen === current;
              const itemLocked = !!lock && !OPEN_WHEN_LOCKED.includes(screen);
              const premium = screen === "subscription";
              return (
                <Pressable
                  key={screen}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.drawerItem, active && styles.drawerItemActive, pressed && styles.drawerItemPressed]}
                  onPress={() => {
                    onClose();
                    go(itemLocked ? "subscription" : screen);
                  }}
                >
                  <Icon name={icon} size={21} color={premium ? colors.warning : active ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.drawerText, { flex: 1 }, active && { color: colors.primary }]}>{text}</Text>
                  {itemLocked ? <Icon name="lock-closed" size={15} color={colors.warning} /> : null}
                  {premium && lock ? <Text style={styles.drawerUpgrade}>Upgrade</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.drawerItem, styles.drawerSignOut, pressed && styles.drawerItemPressed]}
            onPress={() => {
              onClose();
              signOut();
            }}
          >
            <Icon name="log-out-outline" size={21} color={colors.danger} />
            <Text style={[styles.drawerText, { color: colors.danger }]}>Sign out</Text>
          </Pressable>
        </Animated.View>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close menu" />
      </View>
    </Modal>
  );
}

export function Toast({ message, aboveNav }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: message ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [message, opacity]);
  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom: (aboveNav ? NAV_HEIGHT : 0) + space.lg, opacity }]}
    >
      <Icon name="information-circle" size={18} color="#93C5FD" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: NAV_HEIGHT,
    paddingHorizontal: space.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadow.raised,
    shadowOpacity: 0.06,
  },
  navSlot: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center" },
  navPill: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  navPillActive: { backgroundColor: colors.primary },
  navLabel: { color: colors.white, fontSize: 13, fontWeight: "700" },
  navLock: {
    position: "absolute",
    top: 2,
    right: 6,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadge: {
    position: "absolute",
    top: 2,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: { color: colors.white, fontSize: 9, fontWeight: "800" },
  drawerOverlay: { flex: 1, flexDirection: "row", backgroundColor: colors.overlay },
  drawer: {
    width: 300,
    maxWidth: "84%",
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    borderTopRightRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  drawerHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.sm,
    paddingBottom: space.xl,
    marginBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  drawerItem: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  drawerItemActive: { backgroundColor: colors.primarySoft },
  drawerItemPressed: { backgroundColor: colors.background },
  drawerText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  drawerUpgrade: { fontSize: 11, fontWeight: "800", color: colors.white, backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  drawerSignOut: { borderTopWidth: 1, borderTopColor: colors.divider, borderRadius: 0, paddingTop: space.sm },
  toast: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    ...shadow.raised,
  },
  toastText: { flex: 1, color: colors.white, fontSize: 14, fontWeight: "600", lineHeight: 19 },
});

import React, { useEffect, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, formatDate, radius, space } from "../lib/theme";
import { Icon } from "./ui";

const PITCH = {
  vendor: "List tractors, take bookings and manage drivers.",
  shopkeeper: "Sell in the Anaj Mandi, take orders and track earnings.",
};

// Shown at the top of every screen while a vendor's or shopkeeper's subscription isn't active.
export function PremiumBanner({ role, access, onPress }) {
  const [shine] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shine]);
  const expired = !!access?.expiresAt;
  const sweep = shine.interpolate({ inputRange: [0, 1], outputRange: [-160, 460] });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={expired ? "Your premium has ended. Renew now." : "Upgrade to premium"}
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.94 }]}
    >
      <View style={[styles.orb, styles.orbOne]} />
      <View style={[styles.orb, styles.orbTwo]} />
      <Animated.View style={[styles.shine, { transform: [{ translateX: sweep }, { rotate: "18deg" }] }]} pointerEvents="none" />
      <View style={styles.crown}>
        <Icon name="diamond" size={22} color="#1E1B4B" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>{expired ? "PREMIUM ENDED" : "PREMIUM"}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {expired ? "Renew to keep working" : "Upgrade to Premium"}
        </Text>
        <Text style={styles.text} numberOfLines={2}>
          {expired ? `Your plan ended on ${formatDate(access.expiresAt)}. ` : ""}
          {PITCH[role] || "Unlock every feature of AgroTrack."}
        </Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{expired ? "Renew" : "Upgrade"}</Text>
        <Icon name="arrow-forward" size={14} color="#1E1B4B" />
      </View>
    </Pressable>
  );
}

const UNLOCKS = {
  vendor: ["Add and edit tractors", "Accept bookings and assign drivers", "Manage drivers", "Get found by nearby farmers"],
  shopkeeper: ["Add and edit products", "Receive and process orders", "Verify payments and see earnings", "Get found by farmers in the Anaj Mandi"],
};

// Pops up when a vendor/shopkeeper opens the app without an active plan. "Not now" keeps the app locked.
export function PremiumGate({ visible, role, access, fromPrice, onUpgrade, onClose }) {
  const [scale] = useState(() => new Animated.Value(0.9));
  useEffect(() => {
    if (visible) Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    else scale.setValue(0.9);
  }, [visible, scale]);
  const expired = !!access?.expiresAt;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.gateBackdrop}>
        <Animated.View style={[styles.gateCard, { transform: [{ scale }] }]}>
          <View style={styles.gateTop}>
            <View style={[styles.orb, styles.orbOne]} />
            <View style={[styles.orb, styles.orbTwo]} />
            <View style={[styles.crown, styles.gateCrown]}>
              <Icon name="diamond" size={30} color="#1E1B4B" />
            </View>
            <Text style={styles.kicker}>{expired ? "PREMIUM ENDED" : "PREMIUM REQUIRED"}</Text>
            <Text style={styles.gateTitle}>Upgrade to continue</Text>
            <Text style={styles.gateLead}>
              {expired ? `Your plan ended on ${formatDate(access.expiresAt)}. Renew to unlock your workspace again.` : "Your workspace is locked until you choose a plan."}
            </Text>
          </View>
          <View style={styles.gateBody}>
            {(UNLOCKS[role] || []).map((line) => (
              <View key={line} style={styles.gateRow}>
                <Icon name="lock-open" size={16} color={colors.success} />
                <Text style={styles.gateRowText}>{line}</Text>
              </View>
            ))}
            {fromPrice ? <Text style={styles.gatePrice}>Plans from <Text style={{ fontWeight: "900", color: colors.text }}>₹{Number(fromPrice).toLocaleString("en-IN")}/month</Text></Text> : null}
            <Pressable onPress={onUpgrade} accessibilityRole="button" style={({ pressed }) => [styles.gateCta, pressed && { opacity: 0.9 }]}>
              <Icon name="diamond" size={18} color="#1E1B4B" />
              <Text style={styles.gateCtaText}>{expired ? "Renew Premium" : "View Premium plans"}</Text>
            </Pressable>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8} style={styles.gateLater}>
              <Text style={styles.gateLaterText}>Not now</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const GOLD = "#FBBF24";

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    marginBottom: space.xs,
    padding: space.md,
    paddingRight: space.sm,
    borderRadius: radius.lg,
    backgroundColor: "#1E1B4B",
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4338CA",
    shadowColor: "#312E81",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  orb: { position: "absolute", borderRadius: 999 },
  orbOne: { width: 140, height: 140, right: -40, top: -70, backgroundColor: "#4338CA", opacity: 0.55 },
  orbTwo: { width: 90, height: 90, left: -30, bottom: -50, backgroundColor: "#7C3AED", opacity: 0.35 },
  shine: { position: "absolute", top: -40, bottom: -40, width: 50, backgroundColor: "rgba(255,255,255,0.10)" },
  crown: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FDE68A",
  },
  kicker: { color: GOLD, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.white, fontSize: 16, fontWeight: "800", marginTop: 1 },
  text: { color: "#C7D2FE", fontSize: 12, marginTop: 2, lineHeight: 16 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GOLD,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: { color: "#1E1B4B", fontSize: 13, fontWeight: "900" },
  gateBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.72)", alignItems: "center", justifyContent: "center", padding: space.xl },
  gateCard: { width: "100%", maxWidth: 380, borderRadius: radius.xl, backgroundColor: colors.surface, overflow: "hidden" },
  gateTop: { backgroundColor: "#1E1B4B", alignItems: "center", paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.xl, overflow: "hidden" },
  gateCrown: { width: 64, height: 64, borderRadius: 32, marginBottom: space.md },
  gateTitle: { color: colors.white, fontSize: 24, fontWeight: "900", marginTop: 4, textAlign: "center" },
  gateLead: { color: "#C7D2FE", fontSize: 14, lineHeight: 20, marginTop: space.sm, textAlign: "center" },
  gateBody: { padding: space.xl, paddingTop: space.lg },
  gateRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6 },
  gateRowText: { fontSize: 14, color: colors.text, flex: 1 },
  gatePrice: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: space.md },
  gateCta: { marginTop: space.lg, height: 52, borderRadius: 999, backgroundColor: GOLD, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  gateCtaText: { color: "#1E1B4B", fontSize: 16, fontWeight: "900" },
  gateLater: { alignSelf: "center", marginTop: space.md, padding: space.xs },
  gateLaterText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
});

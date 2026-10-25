import React, { useEffect, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { colors, space } from "../lib/theme";

const LOGO = require("../assets/images/tractor_app_icon.png");
// The native splash (app.json: imageWidth 288, splash-icon.png with the logo at 480/1024) draws the logo 135dp wide
// at the exact centre of the whole screen. This screen draws it at the same size and place, and never moves it,
// so the hand-over from the native splash is invisible.
const LOGO_SIZE = 135;
const MIN_VISIBLE_MS = 1700;

// White launch screen: the logo stays put, the AgroTrack name and tagline fade in below it,
// then everything fades out once the app is ready.
export function AppSplash({ ready, onDone }) {
  const [shownAt] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  const [textIn] = useState(() => new Animated.Value(0));
  const [fadeOut] = useState(() => new Animated.Value(1));
  const [dots] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(textIn, { toValue: 1, duration: 450, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const pulse = Animated.loop(Animated.timing(dots, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    pulse.start();
    return () => pulse.stop();
  }, [textIn, dots]);

  useEffect(() => {
    if (!ready) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timer = setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setVisible(false);
        onDone();
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, shownAt, fadeOut, onDone]);

  const textLift = textIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  // A full-screen modal is measured from the real screen edges, not from the app's safe-area padding,
  // so its centre is the same point the native splash uses.
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
      <Animated.View
        style={[styles.root, { opacity: fadeOut }]}
        // Hide the native splash only once this identical white screen is on display.
        onLayout={() => SplashScreen.hideAsync().catch(() => {})}
        accessibilityLabel="AgroTrack is loading"
      >
        {/* Exactly the logo's size, centred by the column; the text hangs below it without moving it. */}
        <View style={styles.logoBox}>
          <Animated.Image source={LOGO} resizeMode="contain" style={styles.logo} />
          <Animated.View style={[styles.textBlock, { opacity: textIn, transform: [{ translateY: textLift }] }]}>
            <Text style={styles.name} numberOfLines={1}>
              Agro<Text style={styles.nameAccent}>Track</Text>
            </Text>
            <Text style={styles.tagline}>Tractors · Marketplace · Agri Doctor</Text>
          </Animated.View>
        </View>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: dots.interpolate({ inputRange: [0, (i + 0.5) / 3, 1], outputRange: [0.25, 1, 0.25], extrapolate: "clamp" }) }]}
            />
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  logoBox: { width: LOGO_SIZE, height: LOGO_SIZE, alignItems: "center" },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  // Hangs below the logo box, wider than it and centred on it.
  textBlock: { position: "absolute", top: LOGO_SIZE + 20, width: 320, left: (LOGO_SIZE - 320) / 2, alignItems: "center" },
  name: { fontSize: 34, fontWeight: "900", color: "#1E293B", letterSpacing: -0.5, textAlign: "center" },
  nameAccent: { color: "#16A34A" },
  tagline: { marginTop: space.xs, fontSize: 14, color: colors.muted, fontWeight: "600", textAlign: "center" },
  dots: { position: "absolute", left: 0, right: 0, bottom: 72, flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4F7CAC" },
});

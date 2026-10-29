import React, { useEffect, useState } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";

// The native splash (app.json: navy background, splash-icon.png drawn 288dp wide) shows the white logo tile
// 144dp square at the exact centre of the screen. This screen draws the same image at the same size and place
// and never moves it, so the hand-over from the native splash is invisible. Regenerate the image with
// `node scripts/make-brand-assets.js`.
const TILE_IMAGE = require("../assets/images/splash-icon.png");
const IMAGE_SIZE = 288;
const TILE = 144;
const BRAND_FONT = "ChakraPetch-Bold"; // embedded by the expo-font plugin (app.json); loaded at runtime in Expo Go / web
const NAVY = "#002C5C";
const SILVER = "#D1D8E0";
const MIN_VISIBLE_MS = 2000;
const BAR_WIDTH = 140;
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Text under the logo, then the tagline and loading bar near the bottom, each fading up in turn.
const STEPS = { agro: 200, track: 350, tagline: 550, footer: 700 };

export function AppSplash({ ready, onDone }) {
  const insets = useSafeAreaInsets();
  const [shownAt] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  const [fadeOut] = useState(() => new Animated.Value(1));
  const [steps] = useState(() => Object.fromEntries(Object.keys(STEPS).map((key) => [key, new Animated.Value(0)])));
  const [bar] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!Font.isLoaded(BRAND_FONT)) Font.loadAsync({ [BRAND_FONT]: require("../assets/fonts/ChakraPetch-Bold.ttf") }).catch(() => {});
    Animated.parallel(
      Object.entries(STEPS).map(([key, delay]) => Animated.timing(steps[key], { toValue: 1, duration: 800, delay, easing: EASE_OUT, useNativeDriver: true })),
    ).start();
    // Restarts itself after each sweep (Animated.loop can stall on its last frame on some platforms).
    let running = true;
    const sweep = () => {
      bar.setValue(0);
      Animated.timing(bar, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(({ finished }) => {
        if (running && finished) sweep();
      });
    };
    sweep();
    return () => {
      running = false;
      bar.stopAnimation();
    };
  }, [steps, bar]);

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

  // The splash covers the whole physical screen. The name must fit between the logo and the footer even on
  // short phones, so its size comes from the space below the centre.
  const screenHeight = Dimensions.get("screen").height;
  const footerSpace = insets.bottom + 150;
  const room = screenHeight / 2 - TILE / 2 - 28 - footerSpace;
  const nameSize = Math.max(30, Math.min(52, Math.floor(room / 2.15)));
  const appear = (value) => ({
    opacity: value,
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  });
  const name = { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.02), letterSpacing: nameSize * 0.06 };

  if (!visible) return null;
  return (
    // A full-screen layer over the app (app/index.jsx renders it last, outside the safe-area padding), not a Modal:
    // a Modal is a separate window that some phones stop above the navigation bar, which cut the bottom off.
    <>
      <StatusBar style="light" />
      <Animated.View
        style={[styles.root, { opacity: fadeOut }]}
        // Hide the native splash only once this identical navy screen is on display.
        onLayout={() => SplashScreen.hideAsync().catch(() => {})}
        accessibilityLabel="AgroTrack is loading"
      >
        {/* Exactly the tile's size, centred by the root; everything else hangs off it without moving it. */}
        <View style={styles.tileBox}>
          <Image source={TILE_IMAGE} style={styles.tileImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={styles.nameBlock}>
            <Animated.Text style={[styles.name, name, appear(steps.agro)]} numberOfLines={1}>
              AGRO
            </Animated.Text>
            <Animated.Text style={[styles.name, name, styles.nameSecond, appear(steps.track)]} numberOfLines={1}>
              TRACK
            </Animated.Text>
          </View>
        </View>
        <View style={[styles.footer, { bottom: insets.bottom + 48 }]}>
          <Animated.View style={appear(steps.tagline)}>
            <Text style={styles.tagline}>Enhancing agricultural mobility</Text>
          </Animated.View>
          <Animated.View style={[styles.barTrack, appear(steps.footer)]}>
            <Animated.View
              style={[
                styles.barFill,
                { transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-BAR_WIDTH / 2, BAR_WIDTH] }) }] },
              ]}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 100, elevation: 100, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  tileBox: { width: TILE, height: TILE },
  // Same image the native splash draws, at the same 288dp width, centred on the tile box.
  tileImage: { position: "absolute", width: IMAGE_SIZE, height: IMAGE_SIZE, left: (TILE - IMAGE_SIZE) / 2, top: (TILE - IMAGE_SIZE) / 2 },
  nameBlock: { position: "absolute", top: TILE + 28, width: 320, left: (TILE - 320) / 2, alignItems: "center" },
  name: {
    fontFamily: BRAND_FONT,
    color: SILVER,
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nameSecond: { marginTop: 4 },
  footer: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: 22 },
  tagline: { color: "rgba(255,255,255,0.8)", fontSize: 15, letterSpacing: 0.4, textAlign: "center" },
  barTrack: { width: BAR_WIDTH, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  barFill: { width: BAR_WIDTH / 2, height: 4, borderRadius: 999, backgroundColor: "#FFFFFF" },
});

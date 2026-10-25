import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// Keep the native splash until the animated AgroTrack splash (components/splash.jsx) is on screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  // react-native-screens defaults the Android status bar to light (white) icons per screen,
  // which disappear on the app's white headers. Force dark icons on a white background.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        statusBarStyle: "dark",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    />
  );
}

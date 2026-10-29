import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { authRequest } from "../lib/api";
import { colors, radius, roleLabel, shadow, space, type } from "../lib/theme";
import { Button, Field, Icon, IconButton, InlineError, keyboardBehavior } from "../components/ui";

const farmImage = require("../assets/images/farm-hero.jpg");
const appLogo = require("../assets/images/tractor_app_logo_main.png");
// Hero image is 1200 × 900; the sign-in card overlaps the hero's bottom edge by this much.
const HERO_RATIO = 900 / 1200;
const SHEET_OVERLAP = 28;
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value.trim());

function AuthHero({ title, subtitle }) {
  // Height follows the screen width so the whole photo shows on every phone instead of being cropped.
  const { width } = useWindowDimensions();
  const photoHeight = Math.round(width * HERO_RATIO);
  return (
    <View style={[styles.hero, { height: photoHeight + SHEET_OVERLAP }]}>
      <Image source={farmImage} style={[styles.heroImage, { width, height: photoHeight }]} resizeMode="cover" />
      <View style={[styles.heroShade, { height: photoHeight }]} />
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <Text style={styles.brand}>AgroTrack</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function Login({ onSuccess, onRegister }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (!validEmail(email)) return setError("Enter the email address you registered with.");
    if (!password) return setError("Enter your password.");
    setLoading(true);
    setError("");
    try {
      onSuccess(await authRequest("/auth/login", { email: email.trim().toLowerCase(), password }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior}>
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <AuthHero title="Smart farm rentals and a fresh agri market" subtitle="Book tractors, sell produce and manage your farm business in one place." />
        <View style={styles.sheet}>
          <Text style={type.title}>Welcome back</Text>
          <Text style={[type.body, styles.sheetLead]}>Sign in to continue to your workspace.</Text>
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secure
            autoComplete="password"
          />
          <InlineError message={error} />
          <Button block loading={loading} onPress={submit} style={{ marginTop: space.lg }}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <View style={styles.switchRow}>
            <Text style={type.body}>New to AgroTrack?</Text>
            <Pressable onPress={onRegister} hitSlop={10} accessibilityRole="button">
              <Text style={styles.switchLink}>Create an account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ROLES = [
  ["farmer", "leaf-outline", "Rent tractors, buy supplies and get crop advice"],
  ["shopkeeper", "storefront-outline", "List products and fulfil marketplace orders"],
  ["vendor", "construct-outline", "Rent out tractors and manage your drivers"],
];

const STEPS = ["Your role", "Contact details", "Password"];

export function Register({ onComplete, onBack }) {
  const [step, setStep] = useState(1),
    [role, setRole] = useState("farmer"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [mobile, setMobile] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const next = () => {
    setError("");
    if (step === 1 && name.trim().length < 2) return setError("Enter your full name.");
    if (step === 2 && !validEmail(email)) return setError("Enter a valid email address.");
    if (step === 2 && mobile.replace(/\D/g, "").length < 10) return setError("Enter a valid 10-digit mobile number.");
    setStep((current) => current + 1);
  };
  const submit = async () => {
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    setError("");
    try {
      onComplete(
        await authRequest("/auth/register", {
          role,
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          password,
          confirmPassword: confirm,
        }),
      );
    } catch (e) {
      setError(e.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };
  const goBack = () => {
    setError("");
    if (step > 1) setStep(step - 1);
    else onBack();
  };
  return (
    <KeyboardAvoidingView style={[styles.flex, styles.page]} behavior={keyboardBehavior}>
      <View style={styles.registerTop}>
        <IconButton icon="arrow-back" onPress={goBack} accessibilityLabel="Go back" />
        <Text style={styles.stepCount}>
          Step {step} of {STEPS.length}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.progress}>
        {STEPS.map((label, index) => (
          <View key={label} style={[styles.progressBar, index < step && styles.progressBarActive]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.registerBody} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <Text style={type.title}>How will you use AgroTrack?</Text>
            <Text style={[type.body, styles.sheetLead]}>Choose your workspace. You can’t change it later.</Text>
            {ROLES.map(([value, icon, text]) => {
              const active = role === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setRole(value)}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                >
                  <View style={[styles.roleIcon, active && styles.roleIconActive]}>
                    <Icon name={icon} size={22} color={active ? colors.white : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.cardTitle}>{roleLabel(value)}</Text>
                    <Text style={type.meta}>{text}</Text>
                  </View>
                  <Icon
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={active ? colors.primary : colors.subtle}
                  />
                </Pressable>
              );
            })}
            <Field
              label="Full name"
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="As on your ID"
              autoCapitalize="words"
              autoComplete="name"
              style={{ marginTop: space.md }}
            />
            <Text style={styles.driverNote}>Drivers are added by their Vendor and sign in with the details they receive.</Text>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text style={type.title}>Your contact details</Text>
            <Text style={[type.body, styles.sheetLead]}>We use these to secure your account and send booking updates.</Text>
            <Field
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="Mobile number"
              icon="call-outline"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={15}
            />
          </>
        ) : null}
        {step === 3 ? (
          <>
            <Text style={type.title}>Secure your account</Text>
            <Text style={[type.body, styles.sheetLead]}>Use at least 8 characters.</Text>
            <Field
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secure
              autoComplete="new-password"
              hint={password && password.length < 8 ? `${8 - password.length} more character(s) needed` : undefined}
            />
            <Field
              label="Confirm password"
              icon="lock-closed-outline"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter password"
              secure
              autoComplete="new-password"
              error={confirm && confirm !== password ? "Passwords do not match" : undefined}
            />
          </>
        ) : null}
        <InlineError message={error} />
      </ScrollView>
      <View style={styles.registerFooter}>
        <Button block loading={loading} onPress={step === STEPS.length ? submit : next} iconRight={step < STEPS.length ? "arrow-forward" : undefined}>
          {loading ? "Creating account..." : step === STEPS.length ? "Create account" : "Continue"}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

export function GetStarted({ user, onDashboard }) {
  return (
    <View style={[styles.flex, styles.page, styles.getStarted]}>
      <View style={styles.successRing}>
        <View style={styles.successIcon}>
          <Icon name="checkmark" size={44} color={colors.white} />
        </View>
      </View>
      <Text style={[type.title, styles.center]}>Welcome, {user?.fullName?.split(" ")[0] || "there"}!</Text>
      <Text style={[type.body, styles.center, { marginTop: space.sm, maxWidth: 300 }]}>
        Your {roleLabel(user?.role).toLowerCase()} account is ready. Let’s open your workspace.
      </Text>
      <View style={styles.getStartedFooter}>
        <Button block onPress={onDashboard} iconRight="arrow-forward">
          Go to my dashboard
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { backgroundColor: colors.surface },
  authScroll: { flexGrow: 1, backgroundColor: colors.surface },
  hero: {
    padding: space.xxl,
    paddingTop: 36,
    justifyContent: "flex-end",
    paddingBottom: SHEET_OVERLAP + space.xxl,
    backgroundColor: colors.surface,
  },
  // The photo stops where the sign-in card begins, so no part of it is hidden under the card.
  heroImage: { position: "absolute", top: 0, left: 0 },
  heroShade: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(11,18,32,0.45)" },
  brandRow: { position: "absolute", top: 32, left: space.xxl, flexDirection: "row", alignItems: "center", gap: space.sm },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // The logo artwork has wide white margins; filling the white circle keeps it readable at this size.
  logoImage: { width: 44, height: 44 },
  brand: { color: colors.white, fontSize: 17, fontWeight: "800" },
  heroTitle: { color: colors.white, fontSize: 26, lineHeight: 32, fontWeight: "800", maxWidth: 320 },
  heroSubtitle: { color: "#DBEAFE", fontSize: 14, lineHeight: 20, marginTop: space.sm, maxWidth: 320 },
  sheet: {
    flex: 1,
    marginTop: -SHEET_OVERLAP,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: space.xxl,
    paddingTop: 28,
  },
  sheetLead: { marginTop: space.xs, marginBottom: space.xxl },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: space.xxl },
  switchLink: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  registerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  stepCount: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  progress: { flexDirection: "row", gap: 6, paddingHorizontal: space.xxl, marginTop: space.lg },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressBarActive: { backgroundColor: colors.primary },
  registerBody: { padding: space.xxl, paddingBottom: space.xxl },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: space.md,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconActive: { backgroundColor: colors.primary },
  driverNote: { ...type.meta, textAlign: "center", marginTop: -space.xs },
  registerFooter: {
    paddingHorizontal: space.xxl,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  getStarted: { alignItems: "center", justifyContent: "center", padding: space.xxl },
  successRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xxl,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  center: { textAlign: "center" },
  getStartedFooter: { position: "absolute", left: space.xxl, right: space.xxl, bottom: space.xxl },
});

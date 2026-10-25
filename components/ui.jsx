import React, { createContext, useContext, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  initials,
  NAV_HEIGHT,
  radius,
  shadow,
  space,
  statusInfo,
  toneColors,
  type,
} from "../lib/theme";

export function Icon({ name, size = 20, color = colors.muted, style }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

// Set by the app for vendors/shopkeepers without an active subscription: { onLocked }.
// Buttons, cards, rows, chips and quick actions inside it show a lock and open the subscription screen.
// Pass `unlocked` to keep one control working (e.g. Back, Retry, Sign out).
export const LockContext = createContext(null);
export const useLock = () => useContext(LockContext);
// For custom Pressables: guard(fn) returns the upgrade action while locked.
export function useLockGuard() {
  const lock = useContext(LockContext);
  return { locked: !!lock, guard: (fn) => (lock ? lock.onLocked : fn) };
}
const NEVER_LOCKED_ICONS = ["arrow-back", "menu", "close", "notifications-outline"];

function LockDot({ style }) {
  return (
    <View style={[styles.lockDot, style]} pointerEvents="none">
      <Ionicons name="lock-closed" size={10} color={colors.white} />
    </View>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary, pressed: colors.primaryPressed },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border, pressed: colors.surfaceMuted },
  soft: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft, pressed: "#DBEAFE" },
  danger: { bg: colors.danger, fg: colors.white, border: colors.danger, pressed: "#B91C1C" },
  dangerSoft: { bg: colors.surface, fg: colors.danger, border: colors.dangerBorder, pressed: colors.dangerSoft },
  success: { bg: colors.success, fg: colors.white, border: colors.success, pressed: "#047857" },
  ghost: { bg: "transparent", fg: colors.primary, border: "transparent", pressed: colors.primarySoft },
  dangerGhost: { bg: "transparent", fg: colors.danger, border: "transparent", pressed: colors.dangerSoft },
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  block = false,
  style,
  accessibilityLabel,
  unlocked = false,
}) {
  const lock = useContext(LockContext);
  const locked = !!lock && !unlocked;
  const v = buttonVariants[variant] || buttonVariants.primary;
  const inactive = disabled || loading;
  const small = size === "sm";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={locked ? "Locked. Opens premium plans." : undefined}
      disabled={inactive}
      onPress={locked ? lock.onLocked : onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        block && styles.buttonBlock,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : locked ? (
        <Icon name="lock-closed" size={small ? 15 : 17} color={v.fg} />
      ) : icon ? (
        <Icon name={icon} size={small ? 16 : 18} color={v.fg} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.fg }]}
      >
        {children}
      </Text>
      {iconRight && !loading ? <Icon name={iconRight} size={small ? 16 : 18} color={v.fg} /> : null}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, badge, color = colors.text, accessibilityLabel, style, tone, unlocked = false }) {
  const lock = useContext(LockContext);
  const locked = !!lock && !unlocked && !NEVER_LOCKED_ICONS.includes(icon);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
      onPress={locked ? lock.onLocked : onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        tone === "soft" && styles.iconButtonSoft,
        pressed && { backgroundColor: colors.surfaceMuted },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={color} />
      {locked ? <LockDot style={styles.lockDotCorner} /> : null}
      {badge && !locked ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Stack screens get a centered title with a back arrow; tab roots get a large left title.
export function Header({ title, subtitle, onBack, right }) {
  if (onBack)
    return (
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Go back" />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerSide}>{right || null}</View>
      </View>
    );
  return (
    <View style={[styles.header, styles.headerRoot]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerRootTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

// Android edge-to-edge no longer resizes the window for the keyboard, so screens avoid it themselves.
export const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

// Scrollable screen body. `tab` reserves room for the bottom navigation, `footer` for a sticky footer.
export function Screen({ children, tab = false, footer = false, onRefresh, refreshing = false, style, contentStyle }) {
  const bottom = (tab ? NAV_HEIGHT : 0) + (footer ? 96 : 0) + space.xxl;
  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior={keyboardBehavior}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.screen, { paddingBottom: bottom }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel, unlocked = false }) {
  const lock = useContext(LockContext);
  const locked = !!lock && !unlocked && !!onPress;
  if (onPress)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={locked ? lock.onLocked : onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      >
        {children}
        {locked ? <LockDot style={styles.lockDotCard} /> : null}
      </Pressable>
    );
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = "neutral", icon, style }) {
  const t = toneColors[tone] || toneColors.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ status, style }) {
  const { tone, label } = statusInfo(status);
  return <Badge label={label} tone={tone} style={style} />;
}

export function SectionHeader({ title, actionLabel, onAction, style }) {
  const lock = useContext(LockContext);
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={type.section}>{title}</Text>
      {onAction ? (
        <Pressable onPress={lock ? lock.onLocked : onAction} hitSlop={10} accessibilityRole="button" style={styles.linkRow}>
          {lock ? <Icon name="lock-closed" size={12} color={colors.primary} /> : null}
          <Text style={styles.link}>{actionLabel || "View all"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = "file-tray-outline", title, text, actionLabel, onAction, compact = false }) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {onAction ? (
        <Button onPress={onAction} style={{ marginTop: space.lg, minWidth: 180 }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={type.meta}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.errorBox}>
      <Icon name="cloud-offline-outline" size={22} color={colors.danger} />
      <View style={{ flex: 1 }}>
        <Text style={styles.errorTitle}>Couldn’t load this</Text>
        <Text style={styles.errorText}>{message}</Text>
      </View>
      {onRetry ? (
        <Button size="sm" variant="dangerSoft" onPress={onRetry} unlocked>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

// Loading / error / empty switch for data screens.
export function DataState({ resource, empty, emptyProps, loadingLabel }) {
  if (resource.loading && !resource.data) return <LoadingState label={loadingLabel} />;
  if (resource.error && !resource.data) return <ErrorState message={resource.error} onRetry={resource.reload} />;
  if (empty) return <EmptyState {...emptyProps} />;
  return null;
}

export function InlineError({ message }) {
  if (!message) return null;
  return (
    <View style={styles.inlineError}>
      <Icon name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.inlineErrorText}>{message}</Text>
    </View>
  );
}

export function Notice({ icon = "information-circle-outline", title, text, tone = "primary", style }) {
  const t = toneColors[tone] || toneColors.primary;
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      <Icon name={icon} size={20} color={t.fg} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.noticeTitle, { color: t.fg }]}>{title}</Text> : null}
        {text ? <Text style={styles.noticeText}>{text}</Text> : null}
      </View>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  secure = false,
  autoCapitalize,
  autoComplete,
  icon,
  prefix,
  hint,
  error,
  maxLength,
  editable = true,
  returnKeyType,
  onSubmitEditing,
  autoFocus,
  style,
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {icon ? <Icon name={icon} size={18} color={focused ? colors.primary : colors.subtle} /> : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secure && hidden}
          autoCapitalize={autoCapitalize ?? (secure ? "none" : "sentences")}
          autoComplete={autoComplete}
          autoCorrect={!secure}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical={multiline ? "top" : "center"}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden(!hidden)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Icon name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map(([key, label, icon]) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {icon ? <Icon name={icon} size={16} color={active ? colors.primary : colors.muted} /> : null}
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon, unlocked = false }) {
  const lock = useContext(LockContext);
  const locked = !!lock && !unlocked;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={locked ? lock.onLocked : onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {locked ? <Icon name="lock-closed" size={12} color={active ? colors.white : colors.muted} /> : icon ? <Icon name={icon} size={14} color={active ? colors.white : colors.muted} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({ icon, iconColor = colors.primary, title, subtitle, onPress, right, last = false, danger = false, unlocked = false, locked: forceLocked = false, onLocked }) {
  const lock = useContext(LockContext);
  const locked = !!onPress && ((!!lock && !unlocked) || forceLocked);
  const upgrade = lock?.onLocked || onLocked;
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerSoft }]}>
          <Icon name={icon} size={19} color={danger ? colors.danger : iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={type.meta} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {locked ? (
        <View style={styles.rowLock}>
          <Icon name="lock-closed" size={14} color={colors.warning} />
        </View>
      ) : right !== undefined ? right : onPress ? <Icon name="chevron-forward" size={18} color={colors.subtle} /> : null}
    </>
  );
  const rowStyle = [styles.row, !last && styles.rowBorder];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={locked && upgrade ? upgrade : onPress}
      style={({ pressed }) => [...rowStyle, pressed && { backgroundColor: colors.background }]}
    >
      {content}
    </Pressable>
  );
}

// Shows the user's uploaded photo, or their initials when there is none (or it fails to load).
export function Avatar({ name, uri, size = 44, tone = "primary" }) {
  const t = toneColors[tone] || toneColors.primary;
  const [failedUri, setFailedUri] = useState(null);
  if (uri && failedUri !== uri)
    return (
      <Image
        source={{ uri }}
        onError={() => setFailedUri(uri)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }}
        accessibilityLabel={`${name || "User"} profile photo`}
      />
    );
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontWeight: "800", fontSize: Math.round(size * 0.38) }}>{initials(name)}</Text>
    </View>
  );
}

export function KeyValue({ label, value, strong = false, last = false }) {
  return (
    <View style={[styles.kv, !last && styles.kvBorder, strong && { alignItems: "center" }]}>
      <Text style={strong ? styles.kvLabelStrong : styles.kvLabel}>{label}</Text>
      <Text style={strong ? styles.kvValueStrong : styles.kvValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export function StatTile({ label, value, icon, tone = "primary", hint }) {
  const t = toneColors[tone] || toneColors.primary;
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={18} color={t.fg} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={styles.statHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function QuickAction({ icon, label, onPress, tone = "primary", unlocked = false }) {
  const t = toneColors[tone] || toneColors.primary;
  const lock = useContext(LockContext);
  const locked = !!lock && !unlocked;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={locked ? lock.onLocked : onPress}
      style={({ pressed }) => [styles.quick, pressed && styles.cardPressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={20} color={t.fg} />
        {locked ? <LockDot style={styles.lockDotCorner} /> : null}
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StickyFooter({ children, style }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

export function Sheet({ visible, title, subtitle, onClose, children, footer }) {
  // Modals draw edge-to-edge, so the sheet pads itself above the phone's navigation bar.
  const insets = useSafeAreaInsets();
  // Inside a modal the inset can read 0 on Android; fall back to the device navigation bar height.
  const bottomInset = Math.max(insets.bottom, initialWindowMetrics?.insets?.bottom || 0);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* The dimmed backdrop covers the status bar, so its icons switch to white while the sheet is open. */}
      {visible ? <StatusBar style="light" /> : null}
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior={keyboardBehavior}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: footer ? 0 : bottomInset }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>{title}</Text>
              {subtitle ? <Text style={[type.meta, { marginTop: 2 }]}>{subtitle}</Text> : null}
            </View>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetBody}
          >
            {children}
          </ScrollView>
          {footer ? <View style={[styles.sheetFooter, { paddingBottom: bottomInset + space.lg }]}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export const ui = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  actions: { flexDirection: "row", gap: space.md },
  flex1: { flex: 1 },
  gapSm: { gap: space.sm },
  section: { marginTop: space.xxl },
});

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm, gap: 6 },
  buttonBlock: { alignSelf: "stretch" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  buttonTextSmall: { fontSize: 13 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSoft: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  iconBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  header: {
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerRoot: { minHeight: 68 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerSide: { width: 44, alignItems: "flex-end" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: space.sm },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  headerRootTitle: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },
  screen: { padding: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  link: { fontSize: 13, fontWeight: "700", color: colors.primary },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: space.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyCompact: { paddingVertical: space.xxl },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "center" },
  emptyText: { ...type.body, color: colors.muted, textAlign: "center", marginTop: space.xs, maxWidth: 300 },
  loading: { alignItems: "center", justifyContent: "center", gap: space.sm, paddingVertical: 40 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  errorTitle: { fontSize: 14, fontWeight: "800", color: colors.danger },
  errorText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  inlineError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.md,
  },
  inlineErrorText: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  notice: {
    flexDirection: "row",
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  noticeTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  noticeText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  field: { marginBottom: space.lg },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: space.sm },
  inputWrap: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrapMultiline: { alignItems: "flex-start", paddingVertical: 12 },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  inputError: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: colors.surfaceMuted },
  input: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 15, color: colors.text, paddingVertical: 0 },
  inputMultiline: { minHeight: 96, paddingTop: 2 },
  prefix: { fontSize: 16, fontWeight: "800", color: colors.text },
  fieldHint: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 17 },
  fieldError: { fontSize: 12, color: colors.danger, marginTop: 6, fontWeight: "600" },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    marginBottom: space.lg,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: space.sm,
  },
  segmentActive: { backgroundColor: colors.surface, ...shadow.card },
  segmentText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  segmentTextActive: { color: colors.primary },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: space.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  avatar: { alignItems: "center", justifyContent: "center" },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.lg,
    paddingVertical: 12,
  },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  kvLabel: { fontSize: 14, color: colors.muted },
  kvValue: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  kvLabelStrong: { fontSize: 15, fontWeight: "800", color: colors.text },
  kvValueStrong: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right" },
  stat: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    ...shadow.card,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 13, fontWeight: "600", color: colors.muted, marginTop: 2 },
  statHint: { fontSize: 11, color: colors.subtle, marginTop: 2 },
  quick: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    ...shadow.card,
  },
  quickIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  lockDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warning,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  lockDotCorner: { position: "absolute", top: -3, right: -3 },
  lockDotCard: { position: "absolute", top: space.sm, right: space.sm },
  rowLock: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.warningSoft, alignItems: "center", justifyContent: "center" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  quickLabel: { fontSize: 12, fontWeight: "700", color: colors.text, textAlign: "center" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadow.raised,
  },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.sm,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: space.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetBody: { padding: space.xl, paddingBottom: space.lg },
  sheetFooter: {
    flexDirection: "row",
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: space.md },
});

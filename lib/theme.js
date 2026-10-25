// Single source of truth for TractorApp's visual language.
// Screens must use these tokens instead of one-off colors and sizes.

export const colors = {
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primarySoft: "#EFF6FF",
  primaryBorder: "#BFDBFE",
  primaryDeep: "#1E3A8A",

  success: "#059669",
  successSoft: "#ECFDF5",
  successBorder: "#A7F3D0",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  warningBorder: "#FDE68A",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  info: "#0284C7",
  infoSoft: "#F0F9FF",
  infoBorder: "#BAE6FD",
  violet: "#7C3AED",
  violetSoft: "#F5F3FF",

  text: "#0F172A",
  textSecondary: "#475569",
  muted: "#64748B",
  subtle: "#94A3B8",
  placeholder: "#94A3B8",

  border: "#E2E8F0",
  divider: "#F1F5F9",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  overlay: "rgba(15,23,42,0.45)",
  ink: "#0B1220",
  white: "#FFFFFF",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const type = {
  display: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
  heading: { fontSize: 18, fontWeight: "800", color: colors.text },
  section: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 21 },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  meta: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.subtle,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
};

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};

// Bottom navigation height; scroll content on tab roots reserves this space.
export const NAV_HEIGHT = 68;

// Every booking and order status maps to exactly one tone and label.
const statusMap = {
  pending: ["warning", "Pending"],
  accepted: ["primary", "Accepted"],
  assigned: ["violet", "Driver assigned"],
  on_the_way: ["info", "On the way"],
  in_progress: ["warning", "In progress"],
  completed: ["success", "Completed"],
  cancelled: ["danger", "Cancelled"],
  placed: ["warning", "Placed"],
  confirmed: ["primary", "Confirmed"],
  packed: ["violet", "Packed"],
  out_for_delivery: ["info", "Out for delivery"],
  delivered: ["success", "Delivered"],
  submitted: ["warning", "Submitted"],
  under_review: ["info", "Under review"],
  advised: ["success", "Advised"],
  available: ["success", "Available"],
  unavailable: ["danger", "Unavailable"],
  active: ["success", "Live"],
  // Marketplace products: admins review new listings.
  in_review: ["warning", "In review"],
  rejected: ["danger", "Needs changes"],
};

// Product status as the shopkeeper sees it (pending = waiting for admin review).
export const productStatus = (product) => (product?.status === "pending" ? "in_review" : product?.status || "active");

export function statusInfo(status) {
  const key = String(status || "").toLowerCase();
  const [tone, label] = statusMap[key] || [
    "neutral",
    key ? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "Unknown",
  ];
  return { tone, label };
}

export const toneColors = {
  primary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primaryBorder },
  success: { bg: colors.successSoft, fg: colors.success, border: colors.successBorder },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warningBorder },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerBorder },
  info: { bg: colors.infoSoft, fg: colors.info, border: colors.infoBorder },
  violet: { bg: colors.violetSoft, fg: colors.violet, border: "#DDD6FE" },
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary, border: colors.border },
};

export const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", options);
}

export function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(date);
}

export const acres = (n) => {
  const value = Number(n) || 0;
  return `${value} acre${value === 1 ? "" : "s"}`;
};

export const shortId =(id) => String(id || "").slice(-6).toUpperCase();

export const initials = (name) =>
  String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

export const roleLabel = (role) =>
  ({ farmer: "Farmer", shopkeeper: "Shopkeeper", vendor: "Vendor", driver: "Driver" })[role] ||
  "Member";

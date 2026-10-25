import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "../lib/api";
import { inAppCheckoutAvailable, payInApp } from "../lib/cashfree";
import { useResource } from "../lib/hooks";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { colors, formatDate, money, radius, roleLabel, shadow, space, timeAgo, type } from "../lib/theme";
import { hasPoint } from "../lib/location";
import { LocationPicker } from "../components/location";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  DataState,
  Field,
  Header,
  Icon,
  IconButton,
  InlineError,
  ListRow,
  Notice,
  Screen,
  Segmented,
  Sheet,
  StickyFooter,
} from "../components/ui";

const ROLE_LINKS = {
  farmer: {
    account: [
      ["My bookings", "bookings", "calendar-outline"],
      ["My orders", "orders", "cube-outline"],
      ["Saved addresses", "addresses", "location-outline"],
      ["Payment methods", "paymentMethods", "card-outline"],
    ],
    preferences: [
      ["Wishlist", "wishlist", "heart-outline"],
      ["Notifications", "notifications", "notifications-outline"],
    ],
  },
  shopkeeper: {
    account: [
      ["My products", "myProducts", "pricetags-outline"],
      ["Orders", "orders", "cube-outline"],
    ],
    preferences: [
      ["Premium plan", "subscription", "diamond-outline"],
      ["Notifications", "notifications", "notifications-outline"],
    ],
  },
  vendor: {
    account: [
      ["My tractors", "tractors", "construct-outline"],
      ["Drivers", "drivers", "people-outline"],
      ["Bookings", "bookings", "calendar-outline"],
    ],
    preferences: [
      ["Premium plan", "subscription", "diamond-outline"],
      ["Notifications", "notifications", "notifications-outline"],
    ],
  },
  driver: {
    account: [["My jobs", "bookings", "car-outline"]],
    preferences: [["Notifications", "notifications", "notifications-outline"]],
  },
};

const SUPPORT_LINKS = [
  ["Help & support", "help", "help-circle-outline"],
  ["Terms of service", "terms", "document-text-outline"],
  ["Privacy policy", "privacy", "shield-checkmark-outline"],
];

function MenuGroup({ title, links, onGo, locked = false, onLocked, subtitles = {} }) {
  if (!links.length) return null;
  return (
    <>
      <Text style={styles.groupTitle}>{title}</Text>
      <Card style={styles.group}>
        {links.map(([label, target, icon, data], index) => (
          <ListRow
            key={label}
            icon={icon}
            iconColor={target === "subscription" ? colors.warning : undefined}
            title={label}
            subtitle={subtitles[target]}
            last={index === links.length - 1}
            onPress={() => onGo(target, data)}
            locked={locked}
            onLocked={onLocked}
          />
        ))}
      </Card>
    </>
  );
}

export function Profile(p) {
  const role = p.user?.role || "farmer";
  const links = ROLE_LINKS[role] || ROLE_LINKS.farmer;
  const [photoSheet, setPhotoSheet] = useState(false),
    [photoBusy, setPhotoBusy] = useState(""),
    [picking, setPicking] = useState(false);
  const updateUser = (user) => p.setSession((current) => (current ? { ...current, user: { ...current.user, ...user } } : current));
  const uploadPhoto = async (fromCamera) => {
    setPhotoBusy(fromCamera ? "camera" : "gallery");
    try {
      const permission = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(fromCamera ? "Allow camera access to take a photo." : "Allow photo access to choose a picture.");
      const options = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const form = new FormData();
      form.append("avatar", new File(asset.uri), asset.fileName || `avatar-${Date.now()}.jpg`);
      const saved = await apiRequest("/auth/avatar", { method: "POST", token: p.token, body: form });
      updateUser(saved.user);
      setPhotoSheet(false);
      p.notify("Profile photo updated");
    } catch (e) {
      p.notify(e.message || "Couldn’t update your photo.");
    } finally {
      setPhotoBusy("");
    }
  };
  const removePhoto = async () => {
    setPhotoBusy("remove");
    try {
      const saved = await apiRequest("/auth/avatar", { method: "DELETE", token: p.token });
      updateUser(saved.user);
      setPhotoSheet(false);
      p.notify("Profile photo removed");
    } catch (e) {
      p.notify(e.message);
    } finally {
      setPhotoBusy("");
    }
  };
  return (
    <>
      <Header title="Profile" onBack={p.isTab ? undefined : p.back} />
      <Screen tab={p.isTab}>
        <Card style={styles.summary}>
          <Pressable onPress={() => setPhotoSheet(true)} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <Avatar name={p.user?.fullName} uri={p.user?.avatarUrl} size={88} />
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={15} color={colors.white} />
            </View>
          </Pressable>
          <Text style={styles.name}>{p.user?.fullName || "Your account"}</Text>
          <Badge label={roleLabel(role)} tone="success" icon="leaf-outline" style={{ alignSelf: "center" }} />
          <View style={styles.metaGroup}>
            <View style={styles.metaRow}>
              <Icon name="mail-outline" size={16} color={colors.subtle} />
              <Text style={styles.metaText}>{p.user?.email || "No email"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name="call-outline" size={16} color={colors.subtle} />
              <Text style={styles.metaText}>{p.user?.mobile || "No mobile number"}</Text>
            </View>
          </View>
          <Button variant="soft" icon="create-outline" block onPress={() => p.go("editProfile")}>
            Edit profile
          </Button>
        </Card>
        <Text style={styles.groupTitle}>Location</Text>
        <Card style={styles.group}>
          <ListRow
            icon="location-outline"
            title={hasPoint(p.user?.location) ? p.user.location.address || "Location saved" : "Location not set"}
            subtitle={hasPoint(p.user?.location) ? "Used for distance matching and weather" : "Needed to match tractors and bookings by distance"}
            onPress={() => setPicking(true)}
            last
            right={<Text style={styles.rowActionText}>{hasPoint(p.user?.location) ? "Change" : "Set"}</Text>}
          />
        </Card>
        <MenuGroup title="Account" links={links.account} onGo={p.go} locked={p.locked} onLocked={p.upgrade} />
        <MenuGroup
          title="Preferences"
          links={links.preferences}
          onGo={p.go}
          subtitles={{ subscription: p.access?.active ? `Active until ${formatDate(p.access.expiresAt)}` : p.access?.required ? "Not active — tap to upgrade" : undefined }}
        />
        <MenuGroup title="Support" links={SUPPORT_LINKS.map(([label, key, icon]) => [label, "info", icon, key])} onGo={p.go} />
        <Button variant="dangerSoft" icon="log-out-outline" block onPress={p.signOut} style={{ marginTop: space.sm }}>
          Sign out
        </Button>
      </Screen>
      <Sheet visible={photoSheet} title="Profile photo" subtitle="Shown on your dashboard and to people you work with" onClose={() => setPhotoSheet(false)}>
        <Button variant="soft" icon="images-outline" block loading={photoBusy === "gallery"} disabled={!!photoBusy} onPress={() => uploadPhoto(false)}>
          Choose from gallery
        </Button>
        <Button variant="secondary" icon="camera-outline" block loading={photoBusy === "camera"} disabled={!!photoBusy} onPress={() => uploadPhoto(true)} style={{ marginTop: space.md }}>
          Take a photo
        </Button>
        {p.user?.avatarUrl ? (
          <Button variant="dangerGhost" icon="trash-outline" block loading={photoBusy === "remove"} disabled={!!photoBusy} onPress={removePhoto} style={{ marginTop: space.md }}>
            Remove photo
          </Button>
        ) : null}
      </Sheet>
      <LocationPicker
        visible={picking}
        title="My location"
        subtitle="Used to match tractors and bookings by distance"
        initial={p.user?.location}
        onClose={() => setPicking(false)}
        onSelect={async (next) => {
          // A GPS fix keeps automatic updates on; a searched place stays fixed until changed.
          await p.saveLocation(next, { manual: next.source !== "gps" });
          setPicking(false);
          p.notify("Location updated");
        }}
        confirmLabel="Save location"
      />
    </>
  );
}

// Full-screen editor for name and mobile number, opened from Profile.
export function EditProfile(p) {
  const [fullName, setFullName] = useState(p.user?.fullName || ""),
    [mobile, setMobile] = useState(p.user?.mobile || ""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const unchanged = fullName.trim() === (p.user?.fullName || "") && mobile.trim() === (p.user?.mobile || "");
  const save = async () => {
    if (fullName.trim().length < 2) return setError("Enter your full name.");
    if (mobile.replace(/\D/g, "").length < 10) return setError("Enter a valid 10-digit mobile number.");
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest("/auth/profile", {
        method: "PATCH",
        token: p.token,
        body: { fullName: fullName.trim(), mobile: mobile.trim() },
      });
      p.setSession((current) => (current ? { ...current, user: { ...current.user, ...result.user } } : current));
      p.notify("Profile updated");
      p.back();
    } catch (e) {
      setError(e.message || "Unable to update profile.");
      setSaving(false);
    }
  };
  return (
    <>
      <Header title="Edit profile" onBack={p.back} />
      <Screen footer>
        <View style={styles.editAvatar}>
          <Avatar name={fullName || p.user?.fullName} uri={p.user?.avatarUrl} size={72} />
          <Text style={[type.meta, { marginTop: space.sm }]}>Change your photo from the Profile screen.</Text>
        </View>
        <Field label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" autoComplete="name" />
        <Field label="Mobile number" icon="call-outline" value={mobile} onChangeText={setMobile} placeholder="10-digit mobile number" keyboardType="phone-pad" autoComplete="tel" />
        <Field label="Email" icon="mail-outline" value={p.user?.email || ""} editable={false} hint="Your email is your sign-in ID and can’t be changed." />
        <InlineError message={error} />
      </Screen>
      <StickyFooter>
        <Button variant="secondary" onPress={p.back} disabled={saving} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button loading={saving} disabled={unchanged} onPress={save} style={{ flex: 1.6 }}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </StickyFooter>
    </>
  );
}

const LABELS = ["Home", "Farm", "Shop", "Other"];

export function Addresses(p) {
  const res = useResource(p.token, async () => (await apiRequest("/addresses", { token: p.token })).addresses || []);
  const [form, setForm] = useState(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const list = res.data || [];
  const open = (item) => {
    setError("");
    setForm(item ? { id: item._id, label: item.label || "Home", address: item.address } : { label: "Home", address: "" });
  };
  const save = async () => {
    if (!form.address.trim()) return setError("Enter the full address.");
    setSaving(true);
    setError("");
    try {
      const body = { label: form.label.trim() || "Address", address: form.address.trim() };
      const result = await apiRequest(form.id ? `/addresses/${form.id}` : "/addresses", {
        method: form.id ? "PATCH" : "POST",
        token: p.token,
        body,
      });
      res.setData(result.addresses || []);
      setForm(null);
      p.notify(form.id ? "Address updated" : "Address saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const makeDefault = async (id) => {
    try {
      const result = await apiRequest(`/addresses/${id}`, { method: "PATCH", token: p.token, body: { isDefault: true } });
      res.setData(result.addresses || []);
      p.notify("Default address updated");
    } catch (e) {
      p.notify(e.message);
    }
  };
  const remove = (item) =>
    Alert.alert("Delete this address?", item.address, [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await apiRequest(`/addresses/${item._id}`, { method: "DELETE", token: p.token });
            res.setData(result.addresses || []);
            p.notify("Address deleted");
          } catch (e) {
            p.notify(e.message);
          }
        },
      },
    ]);
  return (
    <>
      <Header title="Saved addresses" onBack={p.back} />
      <Screen footer onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <DataState
          resource={res}
          loadingLabel="Loading addresses…"
          empty={!!res.data && !list.length}
          emptyProps={{
            icon: "location-outline",
            title: "No saved addresses",
            text: "Save your farm or delivery address to check out faster.",
          }}
        />
        {list.map((item) => (
          <Card key={item._id}>
            <View style={styles.addressTop}>
              <View style={styles.addressIcon}>
                <Icon name={item.label === "Farm" ? "leaf-outline" : item.label === "Shop" ? "storefront-outline" : "home-outline"} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={type.cardTitle}>{item.label || "Address"}</Text>
                  {item.isDefault ? <Badge label="Default" tone="primary" /> : null}
                </View>
                <Text style={[type.body, { marginTop: 2 }]}>{item.address}</Text>
              </View>
            </View>
            <View style={styles.addressActions}>
              {!item.isDefault ? (
                <Button size="sm" variant="ghost" icon="checkmark-circle-outline" onPress={() => makeDefault(item._id)}>
                  Make default
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" icon="create-outline" onPress={() => open(item)}>
                Edit
              </Button>
              <Button size="sm" variant="dangerGhost" icon="trash-outline" onPress={() => remove(item)}>
                Delete
              </Button>
            </View>
          </Card>
        ))}
      </Screen>
      <View style={styles.footer}>
        <Button block icon="add" onPress={() => open(null)}>
          Add new address
        </Button>
      </View>
      <Sheet visible={!!form} title={form?.id ? "Edit address" : "New address"} onClose={() => setForm(null)}>
        {form ? (
          <>
            <Text style={styles.fieldLabel}>Label</Text>
            <View style={styles.labelChips}>
              {LABELS.map((label) => (
                <Chip key={label} label={label} active={form.label === label} onPress={() => setForm({ ...form, label })} />
              ))}
            </View>
            <Field
              label="Full address"
              value={form.address}
              onChangeText={(address) => setForm({ ...form, address })}
              placeholder="House or plot, street, village, district, PIN code"
              multiline
            />
            <InlineError message={error} />
            <View style={styles.formActions}>
              <Button variant="secondary" onPress={() => setForm(null)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button loading={saving} onPress={save} style={{ flex: 1.6 }}>
                {saving ? "Saving…" : "Save address"}
              </Button>
            </View>
          </>
        ) : null}
      </Sheet>
    </>
  );
}

const PAY_TYPES = [
  ["upi", "UPI", "phone-portrait-outline"],
  ["card", "Card", "card-outline"],
  ["bank", "Bank", "business-outline"],
];
const payIcon = (kind) => PAY_TYPES.find(([key]) => key === kind)?.[2] || "card-outline";

export function PaymentMethods(p) {
  const res = useResource(p.token, async () => (await apiRequest("/payment-methods", { token: p.token })).paymentMethods || []);
  const [adding, setAdding] = useState(false),
    [kind, setKind] = useState("upi"),
    [label, setLabel] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const list = res.data || [];
  const add = async () => {
    if (!label.trim()) return setError(kind === "upi" ? "Enter your UPI ID." : "Enter a nickname for this method.");
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest("/payment-methods", { method: "POST", token: p.token, body: { label: label.trim(), type: kind } });
      res.setData(result.paymentMethods || []);
      setAdding(false);
      setLabel("");
      p.notify("Payment method saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = (item) =>
    Alert.alert("Remove this payment method?", item.label, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await apiRequest(`/payment-methods/${item._id}`, { method: "DELETE", token: p.token });
            res.setData(result.paymentMethods || []);
            p.notify("Payment method removed");
          } catch (e) {
            p.notify(e.message);
          }
        },
      },
    ]);
  return (
    <>
      <Header title="Payment methods" onBack={p.back} />
      <Screen footer onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <Notice
          icon="lock-closed-outline"
          text="These are saved for your reference when paying sellers and vendors. The app never charges you directly."
        />
        <DataState
          resource={res}
          loadingLabel="Loading payment methods…"
          empty={!!res.data && !list.length}
          emptyProps={{ icon: "card-outline", title: "No payment methods", text: "Save a UPI ID or a card nickname for quick reference." }}
        />
        {list.length ? (
          <Card style={styles.group}>
            {list.map((item, index) => (
              <ListRow
                key={item._id}
                icon={payIcon(item.type)}
                title={item.label}
                subtitle={`${item.type.toUpperCase()}${item.isDefault ? " · Default" : ""}`}
                last={index === list.length - 1}
                right={
                  <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel={`Remove ${item.label}`} style={styles.rowAction}>
                    <Icon name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
                }
              />
            ))}
          </Card>
        ) : null}
      </Screen>
      <View style={styles.footer}>
        <Button
          block
          icon="add"
          onPress={() => {
            setError("");
            setAdding(true);
          }}
        >
          Add payment method
        </Button>
      </View>
      <Sheet visible={adding} title="Add payment method" onClose={() => setAdding(false)}>
        <Segmented options={PAY_TYPES} value={kind} onChange={setKind} />
        <Field
          label={kind === "upi" ? "UPI ID" : kind === "card" ? "Card nickname" : "Account nickname"}
          value={label}
          onChangeText={setLabel}
          placeholder={kind === "upi" ? "name@bank" : kind === "card" ? "e.g. HDFC Visa •••• 4242" : "e.g. SBI savings •••• 1234"}
          autoCapitalize="none"
          hint={kind === "upi" ? undefined : "Never enter a full card or account number. Use a nickname with the last 4 digits."}
        />
        <InlineError message={error} />
        <View style={styles.formActions}>
          <Button variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button loading={saving} onPress={add} style={{ flex: 1.6 }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </View>
      </Sheet>
    </>
  );
}

const NOTICE_ICON = { booking: "calendar-outline", order: "cube-outline", system: "notifications-outline" };

export function Notifications(p) {
  const res = useResource(p.token, async () => (await apiRequest("/notifications", { token: p.token })).notifications || []);
  const list = res.data || [];
  const unread = list.filter((item) => !item.readAt);
  const markRead = async (item) => {
    if (item.readAt) return;
    try {
      const result = await apiRequest(`/notifications/${item._id}/read`, { method: "PATCH", token: p.token });
      res.setData((current) => (current || []).map((value) => (value._id === item._id ? result.notification : value)));
    } catch (e) {
      p.notify(e.message);
    }
  };
  const markAll = async () => {
    for (const item of unread) await markRead(item);
  };
  return (
    <>
      <Header
        title="Notifications"
        subtitle={unread.length ? `${unread.length} unread` : undefined}
        onBack={p.back}
        right={
          unread.length ? (
            <IconButton icon="checkmark-done" color={colors.primary} tone="soft" onPress={markAll} accessibilityLabel="Mark all as read" />
          ) : null
        }
      />
      <Screen onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <DataState
          resource={res}
          loadingLabel="Loading notifications…"
          empty={!!res.data && !list.length}
          emptyProps={{ icon: "notifications-off-outline", title: "You’re all caught up", text: "Booking and order updates will appear here." }}
        />
        {list.map((item) => {
          const isUnread = !item.readAt;
          return (
            <Card key={item._id} onPress={() => markRead(item)} style={[styles.notice, isUnread && styles.noticeUnread]}>
              <View style={[styles.noticeIcon, isUnread && { backgroundColor: colors.primary }]}>
                <Icon name={NOTICE_ICON[item.type] || "notifications-outline"} size={19} color={isUnread ? colors.white : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={[type.cardTitle, { flex: 1 }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={type.meta}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={[type.body, { marginTop: 2 }]}>{item.body}</Text>
              </View>
              {isUnread ? <View style={styles.unreadDot} /> : null}
            </Card>
          );
        })}
      </Screen>
    </>
  );
}

const PREMIUM_PITCH = {
  vendor: "List your tractors for nearby farmers, accept bookings, add drivers and track every job.",
  shopkeeper: "Sell in the Anaj Mandi marketplace, receive orders, verify payments and track earnings.",
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const daysLeft = (date) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));

// Premium for vendors and shopkeepers. Plans and prices come from the server; payment runs on Cashfree's
// hosted checkout in a browser tab, and the server confirms it with Cashfree before unlocking anything.
export function Subscription(p) {
  const role = p.user?.role;
  const res = useResource(p.token, async () => {
    const [planData, subData] = await Promise.all([
      apiRequest("/subscription/plans", { token: p.token }),
      apiRequest("/subscription", { token: p.token }),
    ]);
    return { plans: planData.plans || [], paymentsEnabled: !!planData.paymentsEnabled, sandbox: !!planData.sandbox, access: subData.access, payments: subData.payments || [] };
  });
  const plans = res.data?.plans || [];
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const bestDiscount = Math.max(0, ...plans.map((plan) => plan.discountPercent || 0));
  const access = res.data?.access || p.access;
  const active = !!access?.active;
  // Paying is paused while a plan runs; it reopens in the last few days before the end date.
  const renewWindow = res.data?.renewWindowDays ?? 7;
  const left = active ? daysLeft(access.expiresAt) : 0;
  const paused = active && left > renewWindow;
  const renewFrom = paused ? new Date(new Date(access.expiresAt).getTime() - renewWindow * 86400000) : null;
  const currentPlan = plans.find((plan) => plan.id === access?.plan);
  const chosen = paused
    ? currentPlan || plans[0]
    : plans.find((plan) => plan.id === selected) || plans[Math.min(1, plans.length - 1)];

  const pay = async () => {
    if (!chosen) return;
    setPaying(true);
    try {
      const returnUrl = Linking.createURL("subscription");
      const checkout = await apiRequest("/subscription/checkout", { method: "POST", token: p.token, body: { plan: chosen.id, returnUrl } });
      // Cashfree's in-app payment sheet; the hosted page in a browser tab where the native SDK isn't built in.
      if (inAppCheckoutAvailable && checkout.paymentSessionId) {
        await payInApp({ sessionId: checkout.paymentSessionId, orderId: checkout.orderId, environment: checkout.environment });
      } else {
        await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, returnUrl);
      }
      // Never trust the phone: the server asks Cashfree. A payment that is still settling gets one more check.
      let result = await apiRequest("/subscription/verify", { method: "POST", token: p.token, body: { orderId: checkout.orderId } });
      if (result.status === "created") {
        await wait(2500);
        result = await apiRequest("/subscription/verify", { method: "POST", token: p.token, body: { orderId: checkout.orderId } });
      }
      if (result.access) p.setAccess?.(result.access);
      p.notify(result.status === "created" ? "Payment not completed. If money was taken, Premium unlocks automatically in a few minutes." : result.message, 4500);
      res.reload();
    } catch (e) {
      p.notify(e.message || "Couldn’t start the payment.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <Header title="Premium" subtitle={role === "shopkeeper" ? "For Anaj Mandi shop owners" : "For tractor vendors"} onBack={p.back} />
      <Screen footer onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <View style={styles.premiumHero}>
          <View style={[styles.heroOrb, { right: -50, top: -60 }]} />
          <View style={[styles.heroOrb, styles.heroOrbSmall]} />
          <View style={styles.heroCrown}>
            <Icon name={active ? "shield-checkmark" : "diamond"} size={26} color="#1E1B4B" />
          </View>
          {active ? (
            <>
              <Text style={styles.heroKicker}>PREMIUM ACTIVE</Text>
              <Text style={styles.heroTitle}>{access.planName || "Premium"} plan</Text>
              <Text style={styles.heroText}>
                Valid until {formatDate(access.expiresAt)} · {left} day{left === 1 ? "" : "s"} left.
                {paused ? ` You can renew from ${formatDate(renewFrom)}.` : " Renew now — the new time starts after this date."}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroKicker}>{access?.expiresAt ? "PREMIUM ENDED" : "UNLOCK AGROTRACK"}</Text>
              <Text style={styles.heroTitle}>Grow your business with Premium</Text>
              <Text style={styles.heroText}>{PREMIUM_PITCH[role] || "Unlock every feature."}</Text>
            </>
          )}
        </View>

        <DataState resource={res} loadingLabel="Loading plans…" />
        {res.data && !plans.length ? <Notice icon="information-circle-outline" text="No plans are available right now. Please contact support." /> : null}

        {plans.length ? <Text style={styles.groupTitle}>{paused ? "Your plan" : active ? "Renew your plan" : "Choose your plan"}</Text> : null}
        {plans.map((plan) => {
          const on = chosen?.id === plan.id;
          const current = active && plan.id === access?.plan;
          const best = plan.discountPercent > 0 && plan.discountPercent === bestDiscount;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              disabled={paused}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: paused }}
              accessibilityLabel={`${plan.name}, ${money(plan.price)}${current ? ", your current plan" : ""}`}
              style={({ pressed }) => [styles.planOption, on && styles.planOptionOn, paused && !current && styles.planOptionMuted, pressed && { opacity: 0.92 }]}
            >
              {current ? (
                <View style={[styles.bestRibbon, styles.currentRibbon]}>
                  <Text style={[styles.bestRibbonText, { color: colors.white }]}>CURRENT PLAN</Text>
                </View>
              ) : best ? (
                <View style={styles.bestRibbon}>
                  <Text style={styles.bestRibbonText}>BEST VALUE</Text>
                </View>
              ) : null}
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPerMonth}>{money(plan.perMonth)}/month{plan.months > 1 ? ` · billed ${money(plan.price)}` : ""}</Text>
                {plan.discountPercent ? (
                  <View style={styles.saveBadge}>
                    <Icon name="pricetag" size={11} color={colors.success} />
                    <Text style={styles.saveText}>Save {plan.discountPercent}%</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {plan.compareAtPrice ? <Text style={styles.strike}>{money(plan.compareAtPrice)}</Text> : null}
                <Text style={[styles.planAmount, on && { color: "#4338CA" }]}>{money(plan.price)}</Text>
                <Text style={styles.planPeriodSmall}>{plan.months === 1 ? "per month" : plan.months === 12 ? "per year" : `for ${plan.months} months`}</Text>
              </View>
            </Pressable>
          );
        })}

        {chosen?.perks?.length ? (
          <Card style={{ marginTop: space.sm }}>
            <Text style={[type.section, { marginBottom: space.xs }]}>What you get</Text>
            {chosen.perks.map((perk) => (
              <View key={perk} style={styles.perk}>
                <Icon name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[type.body, { flex: 1 }]}>{perk}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={styles.trustRow}>
          <Icon name="shield-checkmark-outline" size={16} color={colors.muted} />
          <Text style={[type.meta, { flex: 1 }]}>Secure payment by Cashfree · UPI, cards, net banking and wallets</Text>
        </View>
        {res.data?.sandbox ? <Notice tone="warning" icon="flask-outline" title="Test mode" text="Payments use Cashfree's sandbox. No real money is charged." style={{ marginTop: space.sm }} /> : null}

        {res.data?.payments?.length ? (
          <>
            <Text style={styles.groupTitle}>Payment history</Text>
            <Card style={styles.group}>
              {res.data.payments.map((pay, index) => (
                <ListRow
                  key={pay.id}
                  icon="receipt-outline"
                  title={`${pay.planName} · ${money(pay.amount)}`}
                  subtitle={`${formatDate(pay.paidAt)} · ${pay.method}${pay.periodEnd ? ` · valid till ${formatDate(pay.periodEnd)}` : ""}`}
                  last={index === res.data.payments.length - 1}
                />
              ))}
            </Card>
          </>
        ) : null}
      </Screen>
      {paused ? (
        <StickyFooter>
          <View style={styles.pausedBar} accessibilityRole="text">
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>Already using {access.planName || "Premium"} plan</Text>
              <Text style={type.meta}>Payment paused · renew from {formatDate(renewFrom)}</Text>
            </View>
          </View>
        </StickyFooter>
      ) : chosen ? (
        <StickyFooter>
          <Button icon={active ? "refresh-outline" : "lock-open-outline"} block style={{ flex: 1 }} loading={paying} disabled={!res.data?.paymentsEnabled} onPress={pay}>
            {res.data?.paymentsEnabled ? `${active ? "Renew" : "Pay"} ${money(chosen.price)} · ${chosen.name}` : "Online payment unavailable"}
          </Button>
        </StickyFooter>
      ) : null}
    </>
  );
}

// Help, terms and privacy text comes from the server (GET /api/pages/:key).
export function InfoPage(p) {
  const key = p.item || "help";
  const res = useResource(key, async () => (await apiRequest(`/pages/${encodeURIComponent(key)}`)).page);
  const page = res.data;
  return (
    <>
      <Header title={page?.title || "Help & support"} onBack={p.back} />
      <Screen onRefresh={res.reload} refreshing={res.loading && !!page}>
        <DataState resource={res} loadingLabel="Loading…" />
        {page ? (
          <>
            <View style={styles.infoHero}>
              <Icon name={page.icon || "document-text-outline"} size={30} color={colors.primary} />
            </View>
            {(page.sections || []).map((section) => (
              <Card key={section.heading}>
                <Text style={[type.section, { marginBottom: space.sm }]}>{section.heading}</Text>
                <Text style={type.body}>{section.body}</Text>
              </Card>
            ))}
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowActionText: { fontSize: 14, fontWeight: "800", color: colors.primary },
  editAvatar: { alignItems: "center", marginBottom: space.xl, marginTop: space.sm },
  summary: { alignItems: "center", paddingVertical: space.xxl, gap: space.sm },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: space.sm },
  metaGroup: { alignSelf: "stretch", alignItems: "center", gap: 6, marginVertical: space.md },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.sm, maxWidth: "100%" },
  metaText: { fontSize: 14, color: colors.textSecondary, flexShrink: 1 },
  groupTitle: { ...type.overline, marginTop: space.lg, marginBottom: space.sm, marginLeft: space.xs },
  group: { padding: 0, overflow: "hidden" },
  formActions: { flexDirection: "row", gap: space.md, marginTop: space.xl },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadow.raised,
  },
  addressTop: { flexDirection: "row", gap: space.md },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  addressActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: space.xs,
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: space.sm },
  labelChips: { flexDirection: "row", flexWrap: "wrap", rowGap: space.sm, marginBottom: space.lg },
  rowAction: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  noticeUnread: { borderColor: colors.primaryBorder, backgroundColor: "#FAFCFF" },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
  perk: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  premiumHero: {
    backgroundColor: "#1E1B4B",
    borderRadius: radius.xl,
    padding: space.xl,
    overflow: "hidden",
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: "#4338CA",
  },
  heroOrb: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "#4338CA", opacity: 0.5 },
  heroOrbSmall: { width: 110, height: 110, borderRadius: 55, left: -40, bottom: -60, backgroundColor: "#7C3AED", opacity: 0.35 },
  heroCrown: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FBBF24",
    borderWidth: 2,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  heroKicker: { color: "#FBBF24", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800", marginTop: 4 },
  heroText: { color: "#C7D2FE", fontSize: 14, lineHeight: 20, marginTop: space.sm },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    paddingTop: space.xl,
    marginBottom: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
  },
  planOptionOn: { borderColor: "#4338CA", backgroundColor: "#F5F3FF" },
  planOptionMuted: { opacity: 0.5 },
  currentRibbon: { backgroundColor: colors.success },
  pausedBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.successBorder },
  pausedTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: "#4338CA" },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#4338CA" },
  planName: { fontSize: 17, fontWeight: "800", color: colors.text },
  planPerMonth: { fontSize: 13, color: colors.muted, marginTop: 2 },
  saveBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 6, backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  saveText: { fontSize: 11, fontWeight: "800", color: colors.success },
  strike: { fontSize: 13, color: colors.subtle, textDecorationLine: "line-through" },
  planAmount: { fontSize: 22, fontWeight: "900", color: colors.text },
  planPeriodSmall: { fontSize: 11, color: colors.muted },
  bestRibbon: { position: "absolute", top: 0, right: 0, backgroundColor: "#FBBF24", paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: radius.md },
  bestRibbonText: { fontSize: 10, fontWeight: "900", color: "#1E1B4B", letterSpacing: 0.8 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md, paddingHorizontal: space.xs },
  infoHero: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginVertical: space.lg,
  },
});

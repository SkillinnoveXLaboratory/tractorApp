import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { colors, formatDate, money, radius, shadow, space, type } from "../lib/theme";
import {
  Avatar,
  Button,
  Card,
  DataState,
  EmptyState,
  Field,
  Header,
  Icon,
  IconButton,
  InlineError,
  KeyValue,
  Notice,
  QuickAction,
  Screen,
  SectionHeader,
  Sheet,
  StatTile,
  StickyFooter,
  useLockGuard,
} from "../components/ui";
import { appendPhotos, Gallery, PhotoPicker, Thumb } from "../components/media";
import { DrawerMenu, NAV_FAB_OFFSET } from "../components/shell";
import { BookingCard } from "./bookings";
import { LocationField, LocationPicker } from "../components/location";
import { hasPoint, tractorPlace } from "../lib/location";

function AvailabilityToggle({ value, onChange, busy }) {
  const on = value === "available";
  const { locked, guard } = useLockGuard();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on, busy }}
      accessibilityLabel="Available for booking"
      disabled={busy}
      onPress={guard(() => onChange(on ? "unavailable" : "available"))}
      style={[styles.toggle, on ? styles.toggleOn : styles.toggleOff, busy && { opacity: 0.6 }]}
    >
      <View style={[styles.toggleDot, { backgroundColor: on ? colors.success : colors.danger }]} />
      <Text style={[styles.toggleText, { color: on ? colors.success : colors.danger }]}>
        {busy ? "Saving…" : on ? "Available" : "Unavailable"}
      </Text>
      <Icon name={locked ? "lock-closed" : "swap-horizontal"} size={15} color={on ? colors.success : colors.danger} />
    </Pressable>
  );
}

function TractorForm({ tractor, token, onSaved, onCancel, defaultPlace }) {
  const editing = !!tractor?._id;
  // New listings start at the vendor’s own location; farmers are matched by distance from this point.
  const [place, setPlace] = useState(hasPoint(tractor?.location) ? tractor.location : hasPoint(defaultPlace) ? defaultPlace : null),
    [picking, setPicking] = useState(false);
  const [brand, setBrand] = useState(tractor?.brand || ""),
    [description, setDescription] = useState(tractor?.description || ""),
    [maxDistance, setMaxDistance] = useState(tractor?.maxDistance != null ? String(tractor.maxDistance) : ""),
    [pricePerAcre, setPricePerAcre] = useState(tractor?.pricePerAcre != null ? String(tractor.pricePerAcre) : ""),
    [availability, setAvailability] = useState(tractor?.availability || "available"),
    [existing, setExisting] = useState(tractor?.images || []),
    [photos, setPhotos] = useState([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (!brand.trim()) return setError("Enter the tractor brand and model.");
    if (!description.trim()) return setError("Describe the tractor (HP, condition, attachments).");
    if (!(Number(maxDistance) > 0)) return setError("Enter how far you can travel, in km.");
    if (pricePerAcre === "" || !(Number(pricePerAcre) >= 0)) return setError("Enter a valid price per acre.");
    if (Number(maxDistance) > 1000) return setError("Service radius can be at most 1000 km.");
    if (!hasPoint(place)) return setError("Set where this tractor is based so nearby farmers can find it.");
    if (!existing.length && !photos.length) return setError("Add at least one tractor photo.");
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("brand", brand.trim());
      form.append("description", description.trim());
      form.append("maxDistance", String(Number(maxDistance)));
      form.append("pricePerAcre", String(Number(pricePerAcre)));
      form.append("availability", availability);
      form.append("latitude", String(place.latitude));
      form.append("longitude", String(place.longitude));
      form.append("locationAddress", place.address || "");
      if (editing) form.append("existingImages", JSON.stringify(existing));
      appendPhotos(form, photos, "tractor");
      const result = await apiRequest(editing ? `/tractors/${tractor._id}` : "/tractors", {
        method: editing ? "PATCH" : "POST",
        token,
        body: form,
      });
      onSaved(result.tractor);
    } catch (e) {
      setError(e.message || "Unable to save this tractor.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PhotoPicker
        label="Tractor photos"
        existing={existing}
        onRemoveExisting={(url) => setExisting((list) => list.filter((item) => item !== url))}
        photos={photos}
        onChange={setPhotos}
        onError={setError}
        hint={editing ? "Removed photos are deleted when you save." : "Clear photos from the front and side get more bookings."}
        addIcon="images-outline"
      />
      <Field label="Brand and model" value={brand} onChangeText={setBrand} placeholder="e.g. Mahindra 575 DI" />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Horsepower, condition and attachments available"
        multiline
      />
      <View style={styles.formRow}>
        <Field
          label="Service radius"
          value={maxDistance}
          onChangeText={setMaxDistance}
          placeholder="25"
          keyboardType="decimal-pad"
          hint="Kilometres you travel"
          style={{ flex: 1 }}
        />
        <Field
          label="Price per acre"
          prefix="₹"
          value={pricePerAcre}
          onChangeText={setPricePerAcre}
          placeholder="0"
          keyboardType="decimal-pad"
          style={{ flex: 1 }}
        />
      </View>
      <LocationField
        label="Tractor based at"
        value={place}
        onPress={() => setPicking(true)}
        placeholder="Set where this tractor is kept"
        hint={Number(maxDistance) > 0 ? `Farmers within ${Number(maxDistance)} km of this point can book it.` : "Farmers within the service radius of this point can book it."}
      />
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={type.cardTitle}>Available for booking</Text>
          <Text style={type.meta}>Farmers can only book available tractors.</Text>
        </View>
        <AvailabilityToggle value={availability} onChange={setAvailability} />
      </View>
      <InlineError message={error} />
      <View style={styles.formActions}>
        <Button variant="secondary" onPress={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button loading={saving} onPress={submit} style={{ flex: 1.6 }}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add tractor"}
        </Button>
      </View>
      <LocationPicker
        visible={picking}
        title="Tractor location"
        subtitle="Where is this tractor kept?"
        initial={place}
        onClose={() => setPicking(false)}
        onSelect={(next) => {
          setPlace(next);
          setError("");
          setPicking(false);
        }}
      />
    </>
  );
}

export function TractorFormSheet({ visible, tractor, token, onClose, onSaved, defaultPlace }) {
  return (
    <Sheet
      visible={visible}
      title={tractor?._id ? "Edit tractor" : "Add tractor"}
      subtitle={tractor?._id ? "Update details, pricing or photos" : "List equipment farmers can book"}
      onClose={onClose}
    >
      {visible ? <TractorForm key={tractor?._id || "new"} tractor={tractor} token={token} onSaved={onSaved} onCancel={onClose} defaultPlace={defaultPlace} /> : null}
    </Sheet>
  );
}

export function VendorHome(p) {
  const [drawer, setDrawer] = useState(false),
    [adding, setAdding] = useState(false),
    [picking, setPicking] = useState(false);
  const res = useResource(p.token, async () => {
    const [dash, bookingData] = await Promise.all([
      apiRequest("/dashboard", { token: p.token }),
      apiRequest("/bookings", { token: p.token }),
    ]);
    return { metrics: dash.metrics || {}, bookings: bookingData.bookings || [] };
  });
  const ready = !!res.data;
  const m = res.data?.metrics || {};
  const pending = (res.data?.bookings || []).filter((booking) => booking.status === "pending");
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.top}>
        <IconButton icon="menu" onPress={() => setDrawer(true)} accessibilityLabel="Open menu" />
        <View style={{ flex: 1 }}>
          <Text style={type.meta}>Vendor workspace</Text>
          <Text style={styles.topName} numberOfLines={1}>
            {p.user?.fullName || "Vendor"}
          </Text>
        </View>
        <Pressable onPress={() => p.go("profile")} accessibilityRole="button" accessibilityLabel="Open profile">
          <Avatar name={p.user?.fullName} uri={p.user?.avatarUrl} />
        </Pressable>
      </View>
      <Screen tab onRefresh={res.reload} refreshing={res.loading && ready}>
        {res.error && !ready ? <DataState resource={res} /> : null}
        {!hasPoint(p.user?.location) ? (
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button">
            <Notice
              icon="location-outline"
              tone="warning"
              title="Set your business location"
              text="New tractors use it by default, and farmers are matched by distance. Tap to set it."
            />
          </Pressable>
        ) : null}
        <View style={styles.earnings}>
          <View style={{ flex: 1 }}>
            <Text style={styles.earningsLabel}>Total earnings</Text>
            <Text style={styles.earningsValue}>{ready ? money(m.totalEarnings) : "—"}</Text>
            <Text style={styles.earningsHint}>From completed bookings</Text>
          </View>
          <View style={styles.earningsIcon}>
            <Icon name="wallet-outline" size={26} color={colors.white} />
          </View>
        </View>
        <View style={styles.stats}>
          <StatTile label="Bookings" value={ready ? (m.totalBookings ?? 0) : "—"} icon="calendar-outline" tone="primary" />
          <StatTile label="New requests" value={ready ? pending.length : "—"} icon="notifications-outline" tone="warning" />
          <StatTile label="Tractors" value={ready ? (m.totalTractors ?? 0) : "—"} icon="construct-outline" tone="success" />
          <StatTile label="Drivers" value={ready ? (m.totalDrivers ?? 0) : "—"} icon="people-outline" tone="violet" />
        </View>
        <View style={styles.quickRow}>
          <QuickAction icon="add-circle-outline" label="Add tractor" onPress={() => setAdding(true)} />
          <QuickAction icon="person-add-outline" label="Drivers" onPress={() => p.go("drivers")} tone="violet" />
          <QuickAction icon="calendar-outline" label="Bookings" onPress={() => p.go("bookings")} tone="warning" />
        </View>
        <SectionHeader title="New booking requests" onAction={pending.length ? () => p.go("bookings") : undefined} style={styles.sectionGap} />
        {res.loading && !ready ? <DataState resource={res} loadingLabel="Loading your business…" /> : null}
        {ready && !pending.length ? (
          <EmptyState compact icon="checkmark-done-outline" title="No new requests" text="Requests from farmers will appear here for you to accept." />
        ) : null}
        {pending.slice(0, 4).map((booking) => (
          <BookingCard key={booking._id} booking={booking} role="vendor" onPress={() => p.go("bookingDetail", booking)} />
        ))}
      </Screen>
      <TractorFormSheet
        defaultPlace={p.user?.location}
        visible={adding}
        token={p.token}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          res.reload();
          p.notify("Tractor listed");
        }}
      />
      <LocationPicker
        visible={picking}
        title="Business location"
        subtitle="Where your tractors are usually kept"
        initial={p.user?.location}
        onClose={() => setPicking(false)}
        onSelect={async (next) => {
          await p.saveLocation(next);
          setPicking(false);
          p.notify("Business location saved");
        }}
        confirmLabel="Save location"
      />
      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} user={p.user} go={p.go} signOut={p.signOut} current="home" />
    </View>
  );
}

export function VendorTractors(p) {
  const { locked, guard } = useLockGuard();
  const [adding, setAdding] = useState(false),
    [busyId, setBusyId] = useState("");
  const res = useResource(p.token, async () => (await apiRequest("/tractors/mine", { token: p.token })).tractors || []);
  const setAvailability = async (tractor, availability) => {
    setBusyId(tractor._id);
    try {
      const data = await apiRequest(`/tractors/${tractor._id}/availability`, {
        method: "PATCH",
        token: p.token,
        body: { availability },
      });
      res.setData((list) => (list || []).map((item) => (item._id === tractor._id ? data.tractor : item)));
      p.notify(availability === "available" ? "Tractor is now bookable" : "Tractor hidden from farmers");
    } catch (e) {
      p.notify(e.message);
    } finally {
      setBusyId("");
    }
  };
  const list = res.data || [];
  return (
    <>
      <Header
        title="My tractors"
        subtitle={res.data ? `${list.filter((t) => t.availability === "available").length} of ${list.length} available` : undefined}
        onBack={p.isTab ? undefined : p.back}
        right={<IconButton icon="add" tone="soft" color={colors.primary} onPress={() => setAdding(true)} accessibilityLabel="Add tractor" />}
      />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <DataState
          resource={res}
          loadingLabel="Loading your tractors…"
          empty={!!res.data && !list.length}
          emptyProps={{
            icon: "construct-outline",
            title: "No tractors listed",
            text: "Add your first tractor to start receiving bookings from farmers.",
            actionLabel: "Add tractor",
            onAction: () => setAdding(true),
          }}
        />
        {list.map((tractor) => (
          <Card key={tractor._id} onPress={() => p.go("vendorTractorDetail", tractor)} style={styles.tractorRow}>
            <Thumb uri={tractor.images?.[0]} style={styles.tractorThumb} icon="construct-outline" />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle} numberOfLines={1}>
                {tractor.brand}
              </Text>
              <Text style={type.meta} numberOfLines={2}>
                {tractor.description}
              </Text>
              <View style={[styles.between, { marginTop: space.sm }]}>
                <Text style={styles.price}>
                  {money(tractor.pricePerAcre)}
                  <Text style={styles.unit}> / acre</Text>
                </Text>
                <Text style={type.meta}>{tractor.maxDistance} km</Text>
              </View>
              <View style={{ marginTop: space.sm }}>
                <AvailabilityToggle
                  value={tractor.availability}
                  busy={busyId === tractor._id}
                  onChange={(next) => setAvailability(tractor, next)}
                />
              </View>
            </View>
          </Card>
        ))}
      </Screen>
      {list.length ? (
        <Pressable style={[styles.fab, { bottom: NAV_FAB_OFFSET }]} onPress={guard(() => setAdding(true))} accessibilityRole="button" accessibilityLabel={locked ? "Add tractor, locked" : "Add tractor"}>
          <Icon name={locked ? "lock-closed" : "add"} size={22} color={colors.white} />
          <Text style={styles.fabText}>Add tractor</Text>
        </Pressable>
      ) : null}
      <TractorFormSheet
        defaultPlace={p.user?.location}
        visible={adding}
        token={p.token}
        onClose={() => setAdding(false)}
        onSaved={(tractor) => {
          setAdding(false);
          res.setData((current) => [tractor, ...(current || [])]);
          p.notify("Tractor listed");
        }}
      />
    </>
  );
}

export function VendorTractorDetail(p) {
  const [current, setCurrent] = useState(p.tractor || {}),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState("");
  const setAvailability = async (availability) => {
    setBusy("availability");
    try {
      const data = await apiRequest(`/tractors/${current._id}/availability`, {
        method: "PATCH",
        token: p.token,
        body: { availability },
      });
      setCurrent(data.tractor);
      p.notify(availability === "available" ? "Tractor is now bookable" : "Tractor hidden from farmers");
    } catch (e) {
      p.notify(e.message);
    } finally {
      setBusy("");
    }
  };
  const remove = () =>
    Alert.alert("Delete this tractor?", "This can’t be undone. Tractors with active bookings can’t be deleted.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          try {
            await apiRequest(`/tractors/${current._id}`, { method: "DELETE", token: p.token });
            p.notify("Tractor deleted");
            p.back();
          } catch (e) {
            p.notify(e.message);
            setBusy("");
          }
        },
      },
    ]);
  return (
    <>
      <Header title="Tractor details" onBack={p.back} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Gallery images={current.images || []} icon="construct-outline" />
        <View style={{ padding: space.lg }}>
          <Text style={type.title}>{current.brand}</Text>
          <View style={styles.pricePanel}>
            <View>
              <Text style={type.overline}>Rental rate</Text>
              <Text style={styles.bigPrice}>
                {money(current.pricePerAcre)}
                <Text style={styles.unit}> / acre</Text>
              </Text>
            </View>
            <View style={styles.radiusBox}>
              <Icon name="navigate-outline" size={18} color={colors.primary} />
              <Text style={styles.radiusText}>{current.maxDistance || 0} km</Text>
              <Text style={type.meta}>radius</Text>
            </View>
          </View>
          <Card style={styles.switchCard}>
            <Icon name="location" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={type.overline}>Based at</Text>
              <Text style={type.cardTitle}>{tractorPlace(current)?.address || "Your business location"}</Text>
              <Text style={type.meta}>Farmers within {current.maxDistance || 0} km can book it.</Text>
            </View>
          </Card>
          <Card style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle}>Booking availability</Text>
              <Text style={type.meta}>
                {current.availability === "available" ? "Farmers can book this tractor." : "Hidden from farmers right now."}
              </Text>
            </View>
            <AvailabilityToggle value={current.availability} busy={busy === "availability"} onChange={setAvailability} />
          </Card>
          <Card>
            <Text style={[type.section, { marginBottom: space.sm }]}>Description</Text>
            <Text style={type.body}>{current.description}</Text>
          </Card>
          <Card>
            <KeyValue label="Photos" value={`${current.images?.length || 0} of 6`} />
            <KeyValue label="Listed on" value={formatDate(current.createdAt)} />
            <KeyValue label="Last updated" value={formatDate(current.updatedAt || current.createdAt)} last />
          </Card>
        </View>
      </ScrollView>
      <StickyFooter>
        <Button variant="dangerSoft" icon="trash-outline" loading={busy === "delete"} disabled={!!busy} onPress={remove} style={{ flex: 1 }}>
          Delete
        </Button>
        <Button icon="create-outline" disabled={!!busy} onPress={() => setEditing(true)} style={{ flex: 1.6 }}>
          Edit tractor
        </Button>
      </StickyFooter>
      <TractorFormSheet
        defaultPlace={p.user?.location}
        visible={editing}
        tractor={current}
        token={p.token}
        onClose={() => setEditing(false)}
        onSaved={(tractor) => {
          setCurrent(tractor);
          setEditing(false);
          p.notify("Tractor updated");
        }}
      />
    </>
  );
}

function DriverForm({ token, onSaved, onCancel }) {
  const [fullName, setFullName] = useState(""),
    [email, setEmail] = useState(""),
    [mobile, setMobile] = useState(""),
    [location, setLocation] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (fullName.trim().length < 2) return setError("Enter the driver’s full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (mobile.replace(/\D/g, "").length < 10) return setError("Enter a valid 10-digit mobile number.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest("/drivers", {
        method: "POST",
        token,
        body: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          password,
          confirmPassword,
          location: { address: location.trim() },
        },
      });
      onSaved(result.driver);
    } catch (e) {
      setError(e.message || "Unable to create the driver account.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Notice icon="key-outline" text="Share the email and password with your driver. They can sign in straight away." />
      <Field label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} placeholder="Driver’s name" autoCapitalize="words" />
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="driver@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field label="Mobile number" icon="call-outline" value={mobile} onChangeText={setMobile} placeholder="10-digit number" keyboardType="phone-pad" />
      <Field label="Base location (optional)" icon="location-outline" value={location} onChangeText={setLocation} placeholder="Village or town" />
      <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secure />
      <Field
        label="Confirm password"
        icon="lock-closed-outline"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter password"
        secure
        error={confirmPassword && confirmPassword !== password ? "Passwords do not match" : undefined}
      />
      <InlineError message={error} />
      <View style={styles.formActions}>
        <Button variant="secondary" onPress={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button loading={saving} onPress={submit} style={{ flex: 1.6 }}>
          {saving ? "Creating…" : "Create driver"}
        </Button>
      </View>
    </>
  );
}

export function VendorDrivers(p) {
  const { locked, guard } = useLockGuard();
  const [adding, setAdding] = useState(false);
  const res = useResource(p.token, async () => (await apiRequest("/drivers", { token: p.token })).drivers || []);
  const list = res.data || [];
  return (
    <>
      <Header
        title="Drivers"
        subtitle={res.data ? `${list.length} in your team` : undefined}
        onBack={p.isTab ? undefined : p.back}
        right={<IconButton icon="person-add-outline" tone="soft" color={colors.primary} onPress={() => setAdding(true)} accessibilityLabel="Add driver" />}
      />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <Notice
          icon="shield-checkmark-outline"
          title="Your driver team"
          text="Only drivers you create can be assigned to your bookings, and they only see their own jobs."
        />
        <DataState
          resource={res}
          loadingLabel="Loading your drivers…"
          empty={!!res.data && !list.length}
          emptyProps={{
            icon: "people-outline",
            title: "No drivers yet",
            text: "Create a driver account so you can assign accepted bookings.",
            actionLabel: "Add driver",
            onAction: () => setAdding(true),
          }}
        />
        {list.map((driver) => (
          <Card key={driver._id} style={styles.driverRow}>
            <Avatar name={driver.fullName} uri={driver.avatarUrl} tone="violet" />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle} numberOfLines={1}>
                {driver.fullName}
              </Text>
              <View style={styles.meta}>
                <Icon name="call-outline" size={13} color={colors.subtle} />
                <Text style={type.meta}>{driver.mobile}</Text>
              </View>
              <View style={styles.meta}>
                <Icon name="mail-outline" size={13} color={colors.subtle} />
                <Text style={type.meta} numberOfLines={1}>
                  {driver.email}
                </Text>
              </View>
              {driver.location?.address ? (
                <View style={styles.meta}>
                  <Icon name="location-outline" size={13} color={colors.subtle} />
                  <Text style={type.meta} numberOfLines={1}>
                    {driver.location.address}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>
        ))}
      </Screen>
      {list.length ? (
        <Pressable style={[styles.fab, { bottom: NAV_FAB_OFFSET }]} onPress={guard(() => setAdding(true))} accessibilityRole="button" accessibilityLabel={locked ? "Add driver, locked" : "Add driver"}>
          <Icon name={locked ? "lock-closed" : "person-add"} size={19} color={colors.white} />
          <Text style={styles.fabText}>Add driver</Text>
        </Pressable>
      ) : null}
      <Sheet visible={adding} title="Create driver account" subtitle="Add a driver to your team" onClose={() => setAdding(false)}>
        {adding ? (
          <DriverForm
            token={p.token}
            onCancel={() => setAdding(false)}
            onSaved={(driver) => {
              setAdding(false);
              res.setData((current) => [...(current || []), driver].sort((a, b) => a.fullName.localeCompare(b.fullName)));
              p.notify("Driver account created");
            }}
          />
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  topName: { fontSize: 20, fontWeight: "800", color: colors.text },
  earnings: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.md,
    ...shadow.raised,
  },
  earningsLabel: { color: "#BFDBFE", fontSize: 13, fontWeight: "700" },
  earningsValue: { color: colors.white, fontSize: 30, fontWeight: "800", marginTop: 2 },
  earningsHint: { color: "#93C5FD", fontSize: 12, marginTop: 2 },
  earningsIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  quickRow: { flexDirection: "row", gap: space.md, marginTop: space.md },
  sectionGap: { marginTop: space.xxl },
  tractorRow: { flexDirection: "row", gap: space.md, padding: space.md },
  tractorThumb: { width: 100, height: 128 },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  unit: { fontSize: 13, fontWeight: "600", color: colors.muted },
  toggle: {
    alignSelf: "flex-start",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toggleOn: { backgroundColor: colors.successSoft, borderColor: colors.successBorder },
  toggleOff: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontSize: 13, fontWeight: "800" },
  formRow: { flexDirection: "row", gap: space.md },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchCard: { flexDirection: "row", alignItems: "center", gap: space.md },
  formActions: { flexDirection: "row", gap: space.md, marginTop: space.xl },
  fab: {
    position: "absolute",
    right: space.lg,
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    ...shadow.raised,
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  pricePanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginVertical: space.lg,
  },
  bigPrice: { fontSize: 26, fontWeight: "800", color: colors.text, marginTop: 2 },
  radiusBox: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  radiusText: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 2 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  meta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
});

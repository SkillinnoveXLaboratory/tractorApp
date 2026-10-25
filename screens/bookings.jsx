import React, { useEffect, useState } from "react";
import { Alert, Animated, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { acres, colors, formatDate, money, shortId, space, type } from "../lib/theme";
import {
  Avatar,
  Button,
  Card,
  Chip,
  DataState,
  Header,
  Icon,
  KeyValue,
  ListRow,
  LoadingState,
  Notice,
  Screen,
  SectionHeader,
  StatusBadge,
  StickyFooter,
} from "../components/ui";
import { Thumb } from "../components/media";
import { formatKm, hasPoint } from "../lib/location";

const miniTractor = require("../assets/images/mini-tractor.png");

const ACTIVE = ["accepted", "assigned", "on_the_way", "in_progress"];

const FILTERS = {
  farmer: [["all", "All"], ["pending", "Pending"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]],
  vendor: [["all", "All"], ["pending", "New requests"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]],
  driver: [["all", "All"], ["active", "Active"], ["completed", "Completed"]],
};

const matches = (booking, filter) =>
  filter === "all" ? true : filter === "active" ? ACTIVE.includes(booking.status) : booking.status === filter;

export function Bookings(p) {
  const role = p.user?.role || "farmer";
  const filters = FILTERS[role] || FILTERS.farmer;
  const [filter, setFilter] = useState("all");
  const res = useResource(p.token, async () => (await apiRequest("/bookings", { token: p.token })).bookings || []);
  const list = (res.data || []).filter((booking) => matches(booking, filter));
  const title = role === "driver" ? "My jobs" : role === "vendor" ? "Bookings" : "My bookings";
  const subtitle = role === "vendor" ? "Requests for your tractors" : role === "driver" ? "Work assigned to you" : undefined;
  const pendingCount = (res.data || []).filter((booking) => booking.status === "pending").length;
  return (
    <>
      <Header title={title} subtitle={subtitle} onBack={p.isTab ? undefined : p.back} />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {filters.map(([key, label]) => (
            <Chip
              key={key}
              label={key === "pending" && pendingCount ? `${label} · ${pendingCount}` : label}
              active={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </ScrollView>
        <DataState
          resource={res}
          loadingLabel="Loading bookings…"
          empty={!!res.data && !list.length}
          emptyProps={
            filter !== "all"
              ? { icon: "funnel-outline", title: "Nothing here", text: "No bookings match this filter." }
              : role === "farmer"
                ? {
                    icon: "calendar-outline",
                    title: "No bookings yet",
                    text: "Book a tractor and follow every step here.",
                    actionLabel: "Find a tractor",
                    onAction: () => p.go("tractors"),
                  }
                : role === "vendor"
                  ? { icon: "calendar-outline", title: "No booking requests yet", text: "Requests from farmers for your tractors will appear here." }
                  : { icon: "car-outline", title: "No jobs assigned", text: "Jobs your vendor assigns to you will appear here." }
          }
        />
        {list.map((booking) => (
          <BookingCard key={booking._id} booking={booking} role={role} onPress={() => p.go("bookingDetail", booking)} />
        ))}
      </Screen>
    </>
  );
}

export function BookingCard({ booking, role, onPress }) {
  const party = role === "farmer" ? booking.vendor?.fullName : booking.farmer?.fullName;
  return (
    <Card onPress={onPress} style={styles.bookingCard}>
      <Thumb uri={booking.tractorSnapshot?.image} style={styles.bookingThumb} icon="construct-outline" />
      <View style={{ flex: 1 }}>
        <View style={styles.between}>
          <Text style={[type.cardTitle, { flex: 1 }]} numberOfLines={1}>
            {booking.tractorSnapshot?.brand || "Tractor booking"}
          </Text>
          <Text style={styles.amount}>{money(booking.amount)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="calendar-outline" size={13} color={colors.subtle} />
          <Text style={type.meta}>
            {formatDate(booking.serviceDate)} · {acres(booking.acres)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="location-outline" size={13} color={colors.subtle} />
          <Text style={[type.meta, { flex: 1 }]} numberOfLines={1}>
            {booking.farmLocation}
          </Text>
        </View>
        <View style={[styles.between, { marginTop: space.sm }]}>
          <StatusBadge status={booking.status} />
          {party ? (
            <Text style={[type.meta, styles.party]} numberOfLines={1}>
              {party}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const TRACK = [
  ["pending", "Requested", "document-text-outline"],
  ["accepted", "Accepted", "checkmark-circle-outline"],
  ["assigned", "Driver", "person-outline"],
  ["on_the_way", "On the way", "navigate-outline"],
  ["in_progress", "Working", "play-circle-outline"],
  ["completed", "Done", "flag-outline"],
];
const STOP = 52;

export function BookingStatusTracker({ status }) {
  const active = Math.max(0, TRACK.findIndex(([key]) => key === status));
  const [width, setWidth] = useState(0);
  const [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(motion, { toValue: active, useNativeDriver: true, friction: 8 }).start();
  }, [active, motion]);
  const travel = Math.max(0, width - STOP);
  const shift = motion.interpolate({ inputRange: [0, TRACK.length - 1], outputRange: [0, travel] });
  const progress = TRACK.length > 1 ? active / (TRACK.length - 1) : 0;
  return (
    <View style={styles.tracker}>
      <View style={styles.trackerRail} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View style={styles.trackerLine} />
        <View style={[styles.trackerLine, styles.trackerLineOn, { width: travel * progress }]} />
        <Animated.View style={[styles.miniWrap, { transform: [{ translateX: shift }] }]}>
          <Image source={miniTractor} style={styles.mini} />
        </Animated.View>
        <View style={styles.stops}>
          {TRACK.map(([key, label, icon], index) => (
            <View key={key} style={styles.stop}>
              <View style={[styles.stopDot, index <= active && styles.stopDotOn]}>
                <Icon name={icon} size={13} color={index <= active ? colors.white : colors.subtle} />
              </View>
              <Text style={[styles.stopLabel, index <= active && styles.stopLabelOn]} numberOfLines={2}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const DRIVER_NEXT = {
  assigned: ["on_the_way", "Start trip to farm", "navigate-outline"],
  on_the_way: ["in_progress", "Start service", "play-outline"],
  in_progress: ["completed", "Complete service", "flag-outline"],
};

function confirm(title, message, confirmLabel, onConfirm) {
  Alert.alert(title, message, [
    { text: "Keep", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

// Opens the phone's maps app at the farm pin; falls back to Google Maps in the browser.
function openMaps({ latitude, longitude }, label) {
  const name = encodeURIComponent(label || "Farm");
  const url =
    Platform.OS === "ios" ? `maps:0,0?q=${name}@${latitude},${longitude}` : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${name})`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`));
}

function PersonCard({ label, person, icon = "person-outline" }) {
  if (!person?.fullName) return null;
  return (
    <Card style={styles.personCard}>
      <Avatar name={person.fullName} uri={person.avatarUrl} />
      <View style={{ flex: 1 }}>
        <Text style={type.overline}>{label}</Text>
        <Text style={type.cardTitle}>{person.fullName}</Text>
        {person.mobile ? (
          <View style={styles.metaRow}>
            <Icon name="call-outline" size={13} color={colors.subtle} />
            <Text style={type.meta}>{person.mobile}</Text>
          </View>
        ) : null}
        {person.location?.address ? (
          <View style={styles.metaRow}>
            <Icon name="location-outline" size={13} color={colors.subtle} />
            <Text style={type.meta}>{person.location.address}</Text>
          </View>
        ) : null}
      </View>
      <Icon name={icon} size={20} color={colors.subtle} />
    </Card>
  );
}

export function BookingDetail(p) {
  const [current, setCurrent] = useState(p.booking || {}),
    [changingDriver, setChangingDriver] = useState(false),
    [busy, setBusy] = useState("");
  const role = p.user?.role;
  const status = current.status || "pending";
  const vendorCanAssign = role === "vendor" && ["accepted", "assigned"].includes(status);
  const drivers = useResource(vendorCanAssign ? `${p.token}:drivers` : "none", async () =>
    vendorCanAssign ? (await apiRequest("/drivers", { token: p.token })).drivers || [] : [],
  );
  const keepPeople = (next) => ({
    ...next,
    farmer: typeof next.farmer === "object" ? next.farmer : current.farmer,
    vendor: typeof next.vendor === "object" ? next.vendor : current.vendor,
    driver: next.driver && typeof next.driver !== "object" ? (drivers.data || []).find((d) => d._id === next.driver) || current.driver : next.driver,
  });
  const setStatus = async (next, message) => {
    setBusy(next);
    try {
      const result = await apiRequest(`/bookings/${current._id}`, { method: "PATCH", token: p.token, body: { status: next } });
      setCurrent(keepPeople(result.booking));
      p.notify(message || result.message);
    } catch (e) {
      p.notify(e.message);
    } finally {
      setBusy("");
    }
  };
  const assign = async (driverId) => {
    setBusy(`driver:${driverId}`);
    try {
      const result = await apiRequest(`/bookings/${current._id}/driver`, { method: "PATCH", token: p.token, body: { driverId } });
      setCurrent(keepPeople(result.booking));
      setChangingDriver(false);
      p.notify("Driver assigned");
    } catch (e) {
      p.notify(e.message);
    } finally {
      setBusy("");
    }
  };
  const driver = current.driver && typeof current.driver === "object" ? current.driver : null;
  const showPicker = vendorCanAssign && (!current.driver || changingDriver);
  const cancelled = status === "cancelled";

  let footer = null;
  if (role === "vendor" && status === "pending")
    footer = (
      <>
        <Button
          variant="dangerSoft"
          disabled={!!busy}
          loading={busy === "cancelled"}
          onPress={() => confirm("Decline this request?", "The farmer will see the booking as cancelled.", "Decline", () => setStatus("cancelled", "Request declined"))}
          style={{ flex: 1 }}
        >
          Decline
        </Button>
        <Button disabled={!!busy} loading={busy === "accepted"} icon="checkmark" onPress={() => setStatus("accepted", "Booking accepted")} style={{ flex: 1.6 }}>
          Accept
        </Button>
      </>
    );
  else if (role === "farmer" && ["pending", "accepted"].includes(status))
    footer = (
      <Button
        variant="dangerSoft"
        block
        disabled={!!busy}
        loading={busy === "cancelled"}
        onPress={() => confirm("Cancel this booking?", "The vendor will be told you no longer need this tractor.", "Cancel booking", () => setStatus("cancelled", "Booking cancelled"))}
        style={{ flex: 1 }}
      >
        Cancel booking
      </Button>
    );
  else if (role === "driver" && DRIVER_NEXT[status]) {
    const [next, label, icon] = DRIVER_NEXT[status];
    footer = (
      <Button block icon={icon} disabled={!!busy} loading={busy === next} onPress={() => setStatus(next)} variant={next === "completed" ? "success" : "primary"} style={{ flex: 1 }}>
        {label}
      </Button>
    );
  }

  return (
    <>
      <Header title={role === "driver" ? "Job details" : "Booking details"} subtitle={`#${shortId(current._id)}`} onBack={p.back} />
      <Screen footer={!!footer}>
        <Card style={styles.summary}>
          <Thumb uri={current.tractorSnapshot?.image} style={styles.summaryThumb} icon="construct-outline" />
          <View style={{ flex: 1 }}>
            <Text style={type.heading} numberOfLines={2}>
              {current.tractorSnapshot?.brand || "Tractor booking"}
            </Text>
            <Text style={styles.summaryAmount}>{money(current.amount)}</Text>
            <StatusBadge status={status} style={{ marginTop: space.xs }} />
          </View>
        </Card>
        {cancelled ? (
          <Notice icon="close-circle-outline" tone="danger" title="Booking cancelled" text="This booking won’t go ahead." />
        ) : (
          <Card>
            <Text style={[type.section, { marginBottom: space.md }]}>Progress</Text>
            <BookingStatusTracker status={status} />
          </Card>
        )}
        <Card>
          <Text style={[type.section, { marginBottom: space.xs }]}>Service details</Text>
          <KeyValue label="Service date" value={formatDate(current.serviceDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} />
          <KeyValue label="Farm area" value={acres(current.acres)} />
          <KeyValue label="Farm location" value={current.farmLocation || "—"} />
          {Number.isFinite(current.distanceKm) ? <KeyValue label="Distance from tractor" value={formatKm(current.distanceKm)} /> : null}
          {current.tractorSnapshot?.pricePerAcre ? <KeyValue label="Rate" value={`${money(current.tractorSnapshot.pricePerAcre)} / acre`} /> : null}
          <KeyValue label="Amount" value={money(current.amount)} strong last />
        </Card>
        {current.notes ? (
          <Card>
            <Text style={[type.overline, { marginBottom: space.sm }]}>Notes from farmer</Text>
            <Text style={[type.body, { color: colors.text }]}>{current.notes}</Text>
          </Card>
        ) : null}
        {role !== "farmer" ? <PersonCard label="Farmer" person={current.farmer} /> : null}
        {role !== "farmer" && hasPoint(current.farmPoint) && !cancelled ? (
          <Button variant="soft" icon="navigate-outline" block onPress={() => openMaps(current.farmPoint, current.farmLocation)} style={{ marginBottom: space.md }}>
            Navigate to farm
          </Button>
        ) : null}
        {role !== "vendor" ? <PersonCard label="Vendor" person={current.vendor} icon="business-outline" /> : null}
        {role !== "driver" && driver ? <PersonCard label="Driver" person={driver} icon="car-outline" /> : null}
        {role === "farmer" && !driver && !cancelled && status !== "completed" ? (
          <Notice icon="time-outline" tone="warning" text="A driver will be assigned after the vendor accepts your booking." />
        ) : null}
        {vendorCanAssign ? (
          <>
            <SectionHeader
              title={current.driver ? "Assigned driver" : "Assign a driver"}
              actionLabel={showPicker ? undefined : "Change"}
              onAction={showPicker ? undefined : () => setChangingDriver(true)}
              style={{ marginTop: space.md }}
            />
            {showPicker ? (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {drivers.loading && !drivers.data ? <LoadingState label="Loading your drivers…" /> : null}
                {drivers.data && !drivers.data.length ? (
                  <View style={{ padding: space.lg }}>
                    <Text style={type.body}>You haven’t added any drivers yet.</Text>
                    <Button variant="soft" size="sm" icon="person-add-outline" onPress={() => p.go("drivers")} style={{ marginTop: space.md, alignSelf: "flex-start" }}>
                      Add a driver
                    </Button>
                  </View>
                ) : null}
                {(drivers.data || []).map((item, index, all) => {
                  const selected = String(current.driver?._id || current.driver) === item._id;
                  return (
                    <ListRow
                      key={item._id}
                      icon="person-outline"
                      title={item.fullName}
                      subtitle={item.mobile}
                      last={index === all.length - 1 && !changingDriver}
                      onPress={selected || busy ? undefined : () => assign(item._id)}
                      right={
                        busy === `driver:${item._id}` ? (
                          <Text style={type.meta}>Assigning…</Text>
                        ) : selected ? (
                          <Icon name="checkmark-circle" size={22} color={colors.success} />
                        ) : (
                          <Text style={styles.assignText}>Assign</Text>
                        )
                      }
                    />
                  );
                })}
                {changingDriver ? (
                  <Pressable style={styles.cancelRow} onPress={() => setChangingDriver(false)} accessibilityRole="button">
                    <Text style={styles.cancelText}>Keep current driver</Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : null}
      </Screen>
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  chips: { marginBottom: space.lg, marginHorizontal: -space.lg, paddingHorizontal: space.lg, flexGrow: 0 },
  bookingCard: { flexDirection: "row", gap: space.md, padding: space.md },
  bookingThumb: { width: 84, height: 96 },
  amount: { fontSize: 15, fontWeight: "800", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  party: { flexShrink: 1, fontWeight: "600" },
  summary: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  summaryThumb: { width: 88, height: 88 },
  summaryAmount: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 2 },
  tracker: { paddingTop: space.xs },
  trackerRail: { height: 96, position: "relative" },
  trackerLine: {
    position: "absolute",
    top: 43,
    left: STOP / 2,
    right: STOP / 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primaryBorder,
  },
  trackerLineOn: { right: undefined, backgroundColor: colors.primary },
  miniWrap: { position: "absolute", top: 0, left: 0, width: STOP, alignItems: "center", zIndex: 3 },
  mini: { width: 40, height: 28, resizeMode: "contain" },
  stops: { position: "absolute", top: 30, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between" },
  stop: { width: STOP, alignItems: "center" },
  stopDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stopDotOn: { backgroundColor: colors.primary },
  stopLabel: { fontSize: 10, color: colors.subtle, textAlign: "center", marginTop: 5, lineHeight: 12, fontWeight: "600" },
  stopLabelOn: { color: colors.primary, fontWeight: "800" },
  personCard: { flexDirection: "row", alignItems: "center", gap: space.md },
  assignText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  cancelRow: { minHeight: 52, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.divider },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
});


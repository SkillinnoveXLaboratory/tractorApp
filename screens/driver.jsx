import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { acres, colors, formatDate, money, radius, shadow, space, type } from "../lib/theme";
import {
  Avatar,
  Card,
  DataState,
  EmptyState,
  Header,
  Icon,
  IconButton,
  Screen,
  SectionHeader,
  Segmented,
  StatTile,
  StatusBadge,
} from "../components/ui";
import { Thumb } from "../components/media";
import { MonthlyChart } from "../components/charts";
import { DrawerMenu } from "../components/shell";
import { BookingCard } from "./bookings";

const ACTIVE = ["assigned", "on_the_way", "in_progress"];
const NEXT_STEP = {
  assigned: "Start your trip to the farm",
  on_the_way: "Start the service when you arrive",
  in_progress: "Mark the job complete when finished",
};

export function DriverHome(p) {
  const [drawer, setDrawer] = useState(false),
    [failedImage, setFailedImage] = useState(null),
    [banner, setBanner] = useState(null);
  const res = useResource(p.token, async () => {
    const [bookingData, dash] = await Promise.all([
      apiRequest("/bookings", { token: p.token }),
      apiRequest("/dashboard", { token: p.token }),
    ]);
    return { jobs: bookingData.bookings || [], metrics: dash.metrics || {} };
  });
  const ready = !!res.data;
  const jobs = res.data?.jobs || [];
  const m = res.data?.metrics || {};
  const active = jobs.filter((job) => ACTIVE.includes(job.status));
  const completed = jobs.filter((job) => job.status === "completed");
  const focus = active[0];
  const photo = focus?.tractorSnapshot?.image;
  const hasPhoto = !!photo && failedImage !== photo;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.top}>
        <IconButton icon="menu" onPress={() => setDrawer(true)} accessibilityLabel="Open menu" />
        <View style={{ flex: 1 }}>
          <Text style={type.meta}>Driver workspace</Text>
          <Text style={styles.topName} numberOfLines={1}>
            {p.user?.fullName || "Driver"}
          </Text>
        </View>
        <Pressable onPress={() => p.go("profile")} accessibilityRole="button" accessibilityLabel="Open profile">
          <Avatar name={p.user?.fullName} uri={p.user?.avatarUrl} tone="violet" />
        </Pressable>
      </View>
      <Screen tab onRefresh={res.reload} refreshing={res.loading && ready}>
        {res.error && !ready ? <DataState resource={res} /> : null}
        {focus ? (
          <Pressable
            onPress={() => p.go("bookingDetail", focus)}
            accessibilityRole="button"
            onLayout={(event) => setBanner(event.nativeEvent.layout)}
            style={[styles.focus, hasPhoto && styles.focusWithPhoto]}
          >
            {hasPhoto && banner ? (
              <>
                {/* Exact pixel size of the banner, so the photo neither overflows nor leaves edges uncovered. */}
                <Image
                  source={{ uri: photo }}
                  style={[styles.focusImage, { width: banner.width, height: banner.height }]}
                  resizeMode="cover"
                  onError={() => setFailedImage(photo)}
                />
                {/* Darkens the photo so the white job details stay readable. */}
                <View style={[styles.focusShade, { width: banner.width, height: banner.height }]} />
              </>
            ) : null}
            <View style={styles.between}>
              <Text style={styles.focusEyebrow}>NEXT JOB</Text>
              <StatusBadge status={focus.status} />
            </View>
            <Text style={styles.focusTitle} numberOfLines={1}>
              {focus.tractorSnapshot?.brand || "Tractor job"}
            </Text>
            <View style={styles.focusMeta}>
              <Icon name="location-outline" size={15} color="#BFDBFE" />
              <Text style={styles.focusText} numberOfLines={1}>
                {focus.farmLocation}
              </Text>
            </View>
            <View style={styles.focusMeta}>
              <Icon name="calendar-outline" size={15} color="#BFDBFE" />
              <Text style={styles.focusText}>
                {formatDate(focus.serviceDate)} · {acres(focus.acres)}
              </Text>
            </View>
            <View style={styles.focusCta}>
              <Text style={styles.focusCtaText}>{NEXT_STEP[focus.status]}</Text>
              <Icon name="arrow-forward" size={18} color={colors.primaryDeep} />
            </View>
          </Pressable>
        ) : null}
        <View style={styles.stats}>
          <StatTile label="Active" value={ready ? (m.activeJobs ?? active.length) : "—"} icon="car-outline" tone="primary" />
          <StatTile label="Completed" value={ready ? (m.completedJobs ?? completed.length) : "—"} icon="checkmark-done-outline" tone="success" />
        </View>
        <SectionHeader title="Current jobs" onAction={jobs.length ? () => p.go("bookings") : undefined} style={styles.sectionGap} />
        {res.loading && !ready ? <DataState resource={res} loadingLabel="Loading your jobs…" /> : null}
        {ready && !active.length ? (
          <EmptyState compact icon="car-outline" title="No active jobs" text="Jobs your vendor assigns will appear here." />
        ) : null}
        {active.map((job) => (
          <BookingCard key={job._id} booking={job} role="driver" onPress={() => p.go("bookingDetail", job)} />
        ))}
        {completed.length ? <SectionHeader title="Recently completed" style={styles.sectionGap} /> : null}
        {completed.slice(0, 5).map((job) => (
          <BookingCard key={job._id} booking={job} role="driver" onPress={() => p.go("bookingDetail", job)} />
        ))}
      </Screen>
      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} user={p.user} go={p.go} signOut={p.signOut} current="home" />
    </View>
  );
}

const PERIODS = [
  ["week", "This week"],
  ["month", "This month"],
  ["all", "All time"],
];

// Driver earnings: a fixed pay per completed job, set by TractorApp and recorded on each job when it
// completes. Every figure is calculated by the server (GET /api/earnings); the phone only sends its time zone.
export function DriverEarnings(p) {
  const [period, setPeriod] = useState("month");
  const tz = new Date().getTimezoneOffset();
  const res = useResource(`${p.token}:${period}`, () => apiRequest(`/earnings?period=${period}&tz=${tz}`, { token: p.token }));
  const data = res.data;
  const ready = !!data;
  const s = data?.summary || {};
  const jobs = data?.jobs || [];
  const periodLabel = PERIODS.find(([key]) => key === period)[1].toLowerCase();
  const stale = ready && data.period !== period;
  return (
    <>
      <Header title="Earnings" subtitle={ready ? `${money(data.payPerJob)} for each completed job` : "Your pay for completed jobs"} onBack={p.isTab ? undefined : p.back} />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && ready}>
        <View style={[styles.earnHero, stale && { opacity: 0.6 }]}>
          <View style={styles.earnHeroGlow} />
          <Text style={styles.earnHeroLabel}>Earned {periodLabel}</Text>
          <Text style={styles.earnHeroValue}>{ready ? money(s.total) : "—"}</Text>
          <Text style={styles.earnHeroMeta}>
            {ready ? `From ${s.jobs} completed job${s.jobs === 1 ? "" : "s"}` : "Loading your earnings…"}
          </Text>
          <View style={styles.earnHeroDivider} />
          <View style={styles.between}>
            <View style={styles.pendingRow}>
              <Icon name="time-outline" size={16} color="#FDE68A" />
              <Text style={styles.earnHeroMeta}>Due when active jobs finish</Text>
            </View>
            <Text style={styles.pendingValue}>{ready ? money(s.inProgressTotal) : "—"}</Text>
          </View>
        </View>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} style={{ marginTop: space.lg }} />
        {res.error && !ready ? <DataState resource={res} /> : null}
        <View style={[styles.statGrid, stale && { opacity: 0.6 }]}>
          <StatTile label="Jobs completed" value={ready ? s.jobs : "—"} icon="checkmark-done-outline" tone="success" />
          <StatTile label="Average per job" value={ready ? money(s.average) : "—"} icon="trending-up-outline" tone="primary" />
          <StatTile label="Acres covered" value={ready ? Number(s.acres || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—"} icon="leaf-outline" tone="violet" />
          <StatTile label="Active jobs" value={ready ? s.activeJobs : "—"} icon="car-outline" tone="warning" />
        </View>
        {ready && s.lifetimeJobs ? <MonthlyChart months={data.months || []} noun="job" /> : null}
        <SectionHeader title="Job earnings" style={styles.sectionGap} />
        {res.loading && !ready ? <DataState resource={res} loadingLabel="Loading your earnings…" /> : null}
        {ready && !stale && !jobs.length ? (
          <EmptyState
            compact
            icon="wallet-outline"
            title={s.lifetimeJobs ? `No completed jobs ${periodLabel}` : "No earnings yet"}
            text={s.lifetimeJobs ? "Switch to All time to see earlier jobs." : "Finish a job and your pay for it will appear here."}
          />
        ) : null}
        {jobs.map((job) => (
          <Card key={job._id} onPress={() => p.go("bookingDetail", job)} style={[styles.jobRow, stale && { opacity: 0.6 }]}>
            <Thumb uri={job.tractorSnapshot?.image} style={styles.jobThumb} icon="construct-outline" />
            <View style={{ flex: 1 }}>
              <View style={styles.between}>
                <Text style={[type.cardTitle, { flex: 1 }]} numberOfLines={1}>
                  {job.tractorSnapshot?.brand || "Tractor job"}
                </Text>
                <Text style={styles.jobAmount}>+{money(job.driverPay)}</Text>
              </View>
              <View style={styles.jobMeta}>
                <Icon name="checkmark-circle" size={13} color={colors.success} />
                <Text style={type.meta}>Completed {formatDate(job.completedAt)}</Text>
              </View>
              <View style={styles.jobMeta}>
                <Icon name="location-outline" size={13} color={colors.subtle} />
                <Text style={[type.meta, { flex: 1 }]} numberOfLines={1}>
                  {job.farmLocation}
                </Text>
              </View>
              <Text style={[type.meta, styles.jobCalc]}>
                {acres(job.acres)} · job value {money(job.amount)}
                {job.farmer?.fullName ? ` · ${job.farmer.fullName}` : ""}
              </Text>
            </View>
          </Card>
        ))}
      </Screen>
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
  focus: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.md,
    overflow: "hidden",
    ...shadow.raised,
  },
  // With a photo, the banner's own fill is near-black so no blue rim shows around the rounded corners.
  focusWithPhoto: { backgroundColor: colors.ink },
  focusImage: { position: "absolute", top: 0, left: 0, borderRadius: radius.lg },
  focusShade: { position: "absolute", top: 0, left: 0, borderRadius: radius.lg, backgroundColor: "rgba(11,18,32,0.55)" },
  focusEyebrow: { color: "#93C5FD", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  focusTitle: { color: colors.white, fontSize: 22, fontWeight: "800", marginTop: space.sm, marginBottom: space.sm },
  focusMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  focusText: { flex: 1, color: "#DBEAFE", fontSize: 14 },
  focusCta: {
    marginTop: space.lg,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
  },
  focusCtaText: { color: colors.primaryDeep, fontSize: 14, fontWeight: "800", flex: 1 },
  stats: { flexDirection: "row", gap: space.md, marginBottom: space.md },
  sectionGap: { marginTop: space.xl },
  earnHero: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.xl,
    padding: space.xl,
    overflow: "hidden",
    ...shadow.raised,
  },
  earnHeroGlow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(96,165,250,0.25)",
  },
  earnHeroLabel: { color: "#BFDBFE", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  earnHeroValue: { color: colors.white, fontSize: 38, fontWeight: "800", marginTop: space.xs, letterSpacing: -0.5 },
  earnHeroMeta: { color: "#DBEAFE", fontSize: 13 },
  earnHeroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: space.lg },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingValue: { color: "#FDE68A", fontSize: 16, fontWeight: "800" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginBottom: space.md },
  jobRow: { flexDirection: "row", gap: space.md, padding: space.md },
  jobThumb: { width: 72, height: 72 },
  jobAmount: { fontSize: 16, fontWeight: "800", color: colors.success },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  jobCalc: { marginTop: space.xs, color: colors.textSecondary },
});

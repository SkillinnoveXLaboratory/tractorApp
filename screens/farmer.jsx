import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { distanceKm, formatKm, hasPoint, tractorPlace } from "../lib/location";
import { acres, colors, formatDate, money, radius, space, type } from "../lib/theme";
import {
  Avatar,
  Badge,
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
  Screen,
  SectionHeader,
  Segmented,
  StatusBadge,
  StickyFooter,
} from "../components/ui";
import { appendPhotos, Gallery, PhotoPicker, Thumb } from "../components/media";
import { DrawerMenu } from "../components/shell";
import { LocationField, LocationPicker } from "../components/location";
import { ProductCard, toMarketplaceProduct, TractorCard } from "../components/cards";

const farmImage = require("../assets/images/farm-banner.jpg");
// farm-banner.jpg is 1120 × 700.
const BANNER_RATIO = 700 / 1120;

const greetingFor = (hour) => (hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,");

// Weather codes from Open-Meteo (WMO).
function describeWeather(code) {
  if (code === 0) return ["sunny-outline", "Clear sky"];
  if (code <= 3) return ["partly-sunny-outline", "Partly cloudy"];
  if (code <= 48) return ["cloudy-outline", "Foggy"];
  if (code <= 67) return ["rainy-outline", "Rain"];
  if (code <= 77) return ["snow-outline", "Snow"];
  if (code <= 82) return ["rainy-outline", "Rain showers"];
  return ["thunderstorm-outline", "Thunderstorm"];
}

function WeatherCard({ weather, loading, hasLocation, onAgriDoctor }) {
  const code = Number(weather?.weather_code);
  const [icon, label] = weather ? describeWeather(code) : ["partly-sunny-outline", ""];
  return (
    <View style={styles.weather}>
      <View style={styles.weatherTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.weatherEyebrow}>FARM WEATHER</Text>
          <Text style={styles.weatherTemp}>
            {loading ? "Checking…" : weather ? `${Math.round(weather.temperature_2m)}°C` : "—"}
          </Text>
          <Text style={styles.weatherMeta}>
            {weather
              ? `${label} · Feels ${Math.round(weather.apparent_temperature)}°`
              : hasLocation
                ? "Weather is unavailable right now."
                : "Allow location to see your farm weather."}
          </Text>
        </View>
        <View style={styles.weatherIcon}>
          <Icon name={icon} size={30} color={colors.white} />
        </View>
      </View>
      {weather ? (
        <View style={styles.weatherStats}>
          <View style={styles.weatherStat}>
            <Icon name="water-outline" size={16} color={colors.primary} />
            <Text style={styles.weatherStatText}>Humidity {Math.round(weather.relative_humidity_2m)}%</Text>
          </View>
          <View style={styles.weatherStat}>
            <Icon name="speedometer-outline" size={16} color={colors.primary} />
            <Text style={styles.weatherStatText}>Wind {Math.round(weather.wind_speed_10m)} km/h</Text>
          </View>
        </View>
      ) : null}
      <Pressable style={styles.weatherAction} onPress={onAgriDoctor} accessibilityRole="button">
        <Icon name="medkit-outline" size={18} color={colors.primary} />
        <Text style={styles.weatherActionText}>Crop or soil issue? Ask Agri Doctor</Text>
        <Icon name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// Prompt shown wherever a farmer's location is needed to match tractors.
function LocationNeeded({ onSet }) {
  return (
    <EmptyState
      compact
      icon="location-outline"
      title="Set your farm location"
      text="We only show tractors whose service area reaches your farm."
      actionLabel="Set location"
      onAction={onSet}
    />
  );
}

const locationKey = (place) => (hasPoint(place) ? `${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}` : "none");

function useWeather(token, location) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const lat = location?.latitude;
  const lon = location?.longitude;
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    let active = true;
    const cacheKey = `tractor_weather_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    (async () => {
      let hasCached = false;
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
        if (cached?.weather && active) {
          hasCached = true;
          setWeather(cached.weather);
        }
        // Cached weather is reused for one hour.
        if (cached?.savedAt && Date.now() - cached.savedAt < 60 * 60 * 1000) return;
        if (!hasCached && active) setLoading(true);
        const result = await apiRequest(`/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { token });
        const next = result.weather || null;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ weather: next, savedAt: Date.now() }));
        if (active) setWeather(next);
      } catch {
        if (active && !hasCached) setWeather(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, lat, lon]);
  return { weather, loading };
}

export function FarmerHome(p) {
  const [drawer, setDrawer] = useState(false),
    [picking, setPicking] = useState(false);
  const place = p.user?.location;
  // Banner keeps the photo's own shape on every phone so the whole tractor is visible.
  const { width } = useWindowDimensions();
  const bannerWidth = width - space.lg * 2;
  const bannerHeight = Math.round(bannerWidth * BANNER_RATIO);
  const { weather, loading: weatherLoading } = useWeather(p.token, place);
  // Re-fetched when the farmer's location changes, because tractors are matched by distance.
  const feed = useResource(`${p.token}:${locationKey(place)}`, async () => {
    const [tractorData, productData, bookingData] = await Promise.all([
      apiRequest("/tractors", { token: p.token }),
      apiRequest("/products", { token: p.token }),
      apiRequest("/bookings", { token: p.token }),
    ]);
    return {
      tractors: tractorData.tractors || [],
      locationRequired: !!tractorData.locationRequired,
      products: (productData.products || []).map(toMarketplaceProduct),
      bookings: bookingData.bookings || [],
    };
  });
  const data = feed.data || { tractors: [], products: [], bookings: [] };
  const latest = data.bookings[0];
  return (
    <View style={styles.flex}>
      <View style={styles.homeTop}>
        <IconButton icon="menu" onPress={() => setDrawer(true)} accessibilityLabel="Open menu" />
        <View style={{ flex: 1 }}>
          <Text style={type.meta}>{greetingFor(new Date().getHours())}</Text>
          <Text style={styles.homeName} numberOfLines={1}>
            {p.user?.fullName || "Farmer"}
          </Text>
          <Pressable style={styles.locationRow} onPress={() => setPicking(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change location">
            <Icon name="location" size={13} color={colors.primary} />
            <Text style={[type.meta, { flexShrink: 1 }]} numberOfLines={1}>
              {hasPoint(place) ? place.address || "Current location" : "Set your location"}
            </Text>
            <Icon name="chevron-down" size={13} color={colors.primary} />
          </Pressable>
        </View>
        <Pressable onPress={() => p.go("profile")} accessibilityRole="button" accessibilityLabel="Open profile">
          <Avatar name={p.user?.fullName} uri={p.user?.avatarUrl} size={44} />
        </Pressable>
      </View>
      <Screen tab onRefresh={feed.reload} refreshing={feed.loading && !!feed.data}>
        <Pressable style={styles.searchBox} onPress={() => p.go("search")} accessibilityRole="search">
          <Icon name="search" size={19} color={colors.subtle} />
          <Text style={styles.searchPlaceholder}>Search tractors and products</Text>
        </Pressable>
        <View style={[styles.hero, { height: bannerHeight }]}>
          <Image source={farmImage} style={[styles.heroImage, { width: bannerWidth, height: bannerHeight }]} resizeMode="cover" />
          <View style={styles.heroShade} />
          <Text style={styles.heroTitle}>Need a tractor?</Text>
          <Text style={styles.heroText}>Book verified equipment near your farm.</Text>
          <Button size="sm" onPress={() => p.go("tractors")} iconRight="arrow-forward" style={styles.heroButton}>
            Explore now
          </Button>
        </View>
        <WeatherCard
          weather={weather}
          loading={weatherLoading}
          hasLocation={Number.isFinite(p.user?.location?.latitude)}
          onAgriDoctor={() => p.go("agriAdvice")}
        />
        {feed.error && !feed.data ? <DataState resource={feed} /> : null}
        <SectionHeader title="Tractors near you" onAction={() => p.go("tractors")} style={styles.sectionGap} />
        {feed.loading && !feed.data ? (
          <DataState resource={feed} loadingLabel="Loading tractors…" />
        ) : data.locationRequired ? (
          <LocationNeeded onSet={() => setPicking(true)} />
        ) : data.tractors.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
            {data.tractors.slice(0, 6).map((item) => (
              <TractorCard key={item._id} tractor={item} horizontal onPress={() => p.go("tractor", item)} {...p} />
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            compact
            icon="construct-outline"
            title="No tractors reach your farm yet"
            text="Only tractors whose service area covers your location are shown. Try another location."
            actionLabel="Change location"
            onAction={() => setPicking(true)}
          />
        )}
        <SectionHeader title="Marketplace" onAction={() => p.go("shop")} style={styles.sectionGap} />
        {data.products.length ? (
          <View style={styles.grid}>
            {data.products.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} {...p} />
            ))}
          </View>
        ) : feed.data ? (
          <EmptyState compact icon="basket-outline" title="No products yet" text="Products from shopkeepers will appear here." />
        ) : null}
        <SectionHeader title="My bookings" onAction={() => p.go("bookings")} style={styles.sectionGap} />
        {latest ? (
          <Card onPress={() => p.go("bookingDetail", latest)} style={styles.bookingRow}>
            <Thumb uri={latest.tractorSnapshot?.image} style={styles.bookingThumb} icon="construct-outline" />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle} numberOfLines={1}>
                {latest.tractorSnapshot?.brand || "Tractor booking"}
              </Text>
              <Text style={type.meta}>
                {formatDate(latest.serviceDate)} · {acres(latest.acres)}
              </Text>
              <View style={[styles.between, { marginTop: space.sm }]}>
                <StatusBadge status={latest.status} />
                <Text style={styles.price}>{money(latest.amount)}</Text>
              </View>
            </View>
          </Card>
        ) : feed.data ? (
          <EmptyState
            compact
            icon="calendar-outline"
            title="No bookings yet"
            text="Book a tractor and track it here."
            actionLabel="Find a tractor"
            onAction={() => p.go("tractors")}
          />
        ) : null}
      </Screen>
      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} user={p.user} go={p.go} signOut={p.signOut} current="home" />
      <LocationPicker
        visible={picking}
        title="Your farm location"
        subtitle="Tractors are matched to this location"
        initial={place}
        onClose={() => setPicking(false)}
        onSelect={async (next) => {
          await p.saveLocation(next);
          setPicking(false);
          p.notify("Location updated");
        }}
        confirmLabel="Save location"
      />
    </View>
  );
}

export function TractorList(p) {
  const [q, setQ] = useState(""),
    [area, setArea] = useState(null),
    [picking, setPicking] = useState(false);
  // Search area: a place picked here (not saved), otherwise the farmer's saved location.
  const origin = area || (hasPoint(p.user?.location) ? p.user.location : null);
  const res = useResource(`${p.token}:${locationKey(origin)}`, async () => {
    const query = area ? `?lat=${encodeURIComponent(area.latitude)}&lon=${encodeURIComponent(area.longitude)}` : "";
    const result = await apiRequest(`/tractors${query}`, { token: p.token });
    return { tractors: result.tractors || [], locationRequired: !!result.locationRequired };
  });
  const list = (res.data?.tractors || []).filter((item) =>
    `${item.brand} ${item.description} ${item.owner?.fullName || ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <>
      <Header title="Tractors" subtitle="Only tractors that can reach you" onBack={p.isTab ? undefined : p.back} />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <Pressable style={styles.areaBar} onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Change search location">
          <View style={styles.areaIcon}>
            <Icon name="navigate" size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.overline}>{area ? "Searching near" : "Near your location"}</Text>
            <Text style={type.cardTitle} numberOfLines={1}>
              {origin ? origin.address || "Selected location" : "Location not set"}
            </Text>
          </View>
          {area ? (
            <Pressable onPress={() => setArea(null)} hitSlop={10} accessibilityLabel="Back to my location">
              <Text style={styles.areaReset}>Reset</Text>
            </Pressable>
          ) : null}
          <Text style={styles.areaChange}>Change</Text>
        </Pressable>
        <View style={styles.searchInputBox}>
          <Icon name="search" size={19} color={colors.subtle} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by brand, vendor or feature"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="close-circle" size={18} color={colors.subtle} />
            </Pressable>
          ) : null}
        </View>
        {res.data?.locationRequired ? (
          <LocationNeeded onSet={() => setPicking(true)} />
        ) : (
          <DataState
            resource={res}
            loadingLabel="Finding tractors that reach you…"
            empty={!!res.data && !list.length}
            emptyProps={
              q
                ? { icon: "search-outline", title: "No matches", text: `Nothing matches “${q}”. Try another brand or keyword.` }
                : {
                    icon: "construct-outline",
                    title: "No tractors reach this location",
                    text: "Each vendor sets how far their tractor travels. Try a nearby town or check again later.",
                    actionLabel: "Search another place",
                    onAction: () => setPicking(true),
                  }
            }
          />
        )}
        {list.length ? <Text style={styles.resultCount}>{list.length} available · nearest first</Text> : null}
        {list.map((item) => (
          <TractorCard key={item._id} tractor={item} onPress={() => p.go("tractor", item)} {...p} />
        ))}
      </Screen>
      <LocationPicker
        visible={picking}
        title="Find tractors near"
        subtitle="Search a place or use where you are now"
        initial={origin}
        onClose={() => setPicking(false)}
        onSelect={async (next) => {
          // Without a saved location yet, the first choice becomes the farmer's location.
          if (!hasPoint(p.user?.location)) await p.saveLocation(next);
          else setArea(next);
          setPicking(false);
        }}
        confirmLabel="Show tractors here"
      />
    </>
  );
}

export function TractorDetail(p) {
  const t = p.tractor || {};
  const available = t.availability === "available";
  return (
    <>
      <Header title="Tractor details" onBack={p.back} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Gallery images={t.images || []} icon="construct-outline" />
        <View style={styles.detailBody}>
          <StatusBadge status={available ? "available" : "unavailable"} />
          <Text style={[type.title, { marginTop: space.sm }]}>{t.brand || "Tractor"}</Text>
          <View style={styles.pricePanel}>
            <View>
              <Text style={type.overline}>Rental rate</Text>
              <Text style={styles.bigPrice}>
                {money(t.pricePerAcre)}
                <Text style={styles.priceUnit}> / acre</Text>
              </Text>
            </View>
            <View style={styles.radiusBox}>
              <Icon name="navigate-outline" size={18} color={colors.primary} />
              <Text style={styles.radiusText}>{t.maxDistance || 0} km</Text>
              <Text style={type.meta}>service radius</Text>
            </View>
          </View>
          <Card style={styles.vendorCard}>
            <View style={styles.areaIcon}>
              <Icon name="location" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.overline}>Based at</Text>
              <Text style={type.cardTitle}>{tractorPlace(t)?.address || "Vendor’s location"}</Text>
              <Text style={type.meta}>
                {Number.isFinite(t.distanceKm) ? `${formatKm(t.distanceKm)} from you · ` : ""}serves farms within {t.maxDistance || 0} km
              </Text>
            </View>
          </Card>
          {t.description ? (
            <Card>
              <Text style={[type.section, { marginBottom: space.sm }]}>About this tractor</Text>
              <Text style={type.body}>{t.description}</Text>
            </Card>
          ) : null}
          <Card style={styles.vendorCard}>
            <Avatar name={t.owner?.fullName} uri={t.owner?.avatarUrl} />
            <View style={{ flex: 1 }}>
              <Text style={type.overline}>Listed by</Text>
              <Text style={type.cardTitle}>{t.owner?.fullName || "Verified vendor"}</Text>
              {t.owner?.location?.address ? <Text style={type.meta}>{t.owner.location.address}</Text> : null}
            </View>
          </Card>
          <Notice
            icon="shield-checkmark-outline"
            title="How booking works"
            text="Your request goes to the vendor. Once they accept, a driver is assigned and you can track progress live."
          />
        </View>
      </ScrollView>
      <StickyFooter>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={type.meta}>From</Text>
          <Text style={styles.price}>{money(t.pricePerAcre)} / acre</Text>
        </View>
        <Button disabled={!available} onPress={() => p.go("booking", t)} style={{ flex: 1.4 }}>
          {available ? "Book now" : "Unavailable"}
        </Button>
      </StickyFooter>
    </>
  );
}

const BOOKING_STEPS = ["Tractor", "Farm", "Price", "Review", "Confirm"];

function upcomingDays(count = 30) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return {
      iso,
      weekday: index === 0 ? "Today" : index === 1 ? "Tmrw" : day.toLocaleDateString("en-IN", { weekday: "short" }),
      date: day.getDate(),
      month: day.toLocaleDateString("en-IN", { month: "short" }),
    };
  });
}

function Stepper({ step }) {
  return (
    <View style={styles.stepper}>
      {BOOKING_STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const active = number === step;
        return (
          <React.Fragment key={label}>
            {index ? <View style={[styles.stepLine, number <= step && styles.stepLineDone]} /> : null}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, (done || active) && styles.stepDotActive]}>
                {done ? (
                  <Icon name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.stepNumber, active && { color: colors.white }]}>{number}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>{label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function BookTractor(p) {
  const tractor = p.tractor || {};
  const days = useMemo(() => upcomingDays(), []);
  const saved = hasPoint(p.user?.location) ? p.user.location : null;
  const [step, setStep] = useState(1),
    [acreText, setAcreText] = useState("1"),
    [farm, setFarm] = useState(saved),
    [landmark, setLandmark] = useState(saved?.address || ""),
    [picking, setPicking] = useState(false),
    [date, setDate] = useState(""),
    [notes, setNotes] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const numericAcres = Number(acreText) || 0;
  const total = numericAcres * Number(tractor.pricePerAcre || 0);
  const selectedDay = days.find((day) => day.iso === date);
  const adjustAcres = (delta) => setAcreText(String(Math.max(0.5, Math.round((numericAcres + delta) * 2) / 2)));
  // Same distance rule the server enforces: the farm must be inside the tractor's service radius.
  const base = tractorPlace(tractor);
  const reach = hasPoint(farm) && base ? distanceKm(farm, base) : null;
  const outOfRange = reach != null && reach > Number(tractor.maxDistance || 0);
  const farmText = landmark.trim() || farm?.address || "";
  const validFarm = () => {
    if (!hasPoint(farm)) return "Pin your farm location.";
    if (outOfRange) return `This tractor serves farms within ${tractor.maxDistance} km. Your farm is ${formatKm(reach)} away.`;
    if (!farmText) return "Add your farm address or a landmark.";
    if (numericAcres <= 0) return "Enter the farm area in acres.";
    if (numericAcres > 10000) return "Farm area looks too large. Check the acres.";
    if (!date) return "Choose a service date.";
    return "";
  };
  const advance = () => {
    if (step === 2) {
      const problem = validFarm();
      if (problem) return setError(problem);
    }
    setError("");
    setStep(step + 1);
  };
  const create = async () => {
    const problem = validFarm();
    if (problem) {
      setStep(2);
      return setError(problem);
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/bookings", {
        method: "POST",
        token: p.token,
        body: {
          tractorId: tractor._id,
          farmLocation: farmText,
          farmLatitude: farm.latitude,
          farmLongitude: farm.longitude,
          serviceDate: date,
          acres: numericAcres,
          notes: notes.trim(),
        },
      });
      p.notify("Booking request sent to the vendor");
      p.replace("bookingDetail", result.booking);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Header title="Book tractor" subtitle={`Step ${step} of 5 · ${BOOKING_STEPS[step - 1]}`} onBack={p.back} />
      <Screen footer>
        <Stepper step={step} />
        {step === 1 ? (
          <>
            <Text style={[type.section, styles.stepTitle]}>Selected tractor</Text>
            <TractorCard tractor={tractor} />
            <Notice icon="information-circle-outline" text="Pricing is per acre. The vendor confirms your request before any work starts." />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text style={[type.section, styles.stepTitle]}>Farm details</Text>
            <LocationField
              label="Farm location"
              value={farm}
              onPress={() => setPicking(true)}
              placeholder="Pin where the work is needed"
            />
            {reach != null ? (
              <Notice
                icon={outOfRange ? "close-circle-outline" : "checkmark-circle-outline"}
                tone={outOfRange ? "danger" : "success"}
                title={outOfRange ? "Outside this tractor’s service area" : "This tractor can reach your farm"}
                text={`Farm is ${formatKm(reach)} from the tractor · it serves up to ${tractor.maxDistance} km.`}
              />
            ) : null}
            <Field
              label="Address or landmark"
              icon="home-outline"
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Plot number, village or nearby landmark"
              hint="Helps the driver find the exact field."
            />
            <Text style={styles.fieldLabel}>Farm area (acres)</Text>
            <View style={styles.acreRow}>
              <Pressable style={styles.acreButton} onPress={() => adjustAcres(-0.5)} accessibilityLabel="Decrease acres">
                <Icon name="remove" size={22} color={colors.text} />
              </Pressable>
              <TextInput
                value={acreText}
                onChangeText={(value) => setAcreText(value.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                style={styles.acreInput}
                accessibilityLabel="Farm area in acres"
              />
              <Pressable style={styles.acreButton} onPress={() => adjustAcres(0.5)} accessibilityLabel="Increase acres">
                <Icon name="add" size={22} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Service date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={[styles.bleedContent, { gap: space.sm }]}>
              {days.map((day) => {
                const active = day.iso === date;
                return (
                  <Pressable
                    key={day.iso}
                    onPress={() => setDate(day.iso)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayWeek, active && styles.dayTextActive]}>{day.weekday}</Text>
                    <Text style={[styles.dayDate, active && styles.dayTextActive]}>{day.date}</Text>
                    <Text style={[styles.dayWeek, active && styles.dayTextActive]}>{day.month}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Field
              label="Notes for the vendor (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Crop, soil condition, attachments needed…"
              multiline
              style={{ marginTop: space.lg }}
            />
          </>
        ) : null}
        {step === 3 ? (
          <Card>
            <Text style={[type.section, { marginBottom: space.sm }]}>Price estimate</Text>
            <KeyValue label="Rate" value={`${money(tractor.pricePerAcre)} / acre`} />
            <KeyValue label="Farm area" value={acres(numericAcres)} />
            <KeyValue label="Estimated total" value={money(total)} strong last />
          </Card>
        ) : null}
        {step === 4 ? (
          <Card>
            <Text style={[type.section, { marginBottom: space.sm }]}>Review your request</Text>
            <KeyValue label="Tractor" value={tractor.brand || "—"} />
            <KeyValue label="Farm location" value={farmText || "—"} />
            {reach != null ? <KeyValue label="Distance from tractor" value={formatKm(reach)} /> : null}
            <KeyValue label="Service date" value={selectedDay ? formatDate(date) : "—"} />
            <KeyValue label="Farm area" value={acres(numericAcres)} />
            {notes.trim() ? <KeyValue label="Notes" value={notes.trim()} /> : null}
            <KeyValue label="Total" value={money(total)} strong last />
          </Card>
        ) : null}
        {step === 5 ? (
          <>
            <Card style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Icon name="paper-plane-outline" size={26} color={colors.primary} />
              </View>
              <Text style={[type.heading, { textAlign: "center" }]}>Ready to send</Text>
              <Text style={[type.body, { textAlign: "center", marginTop: space.xs }]}>
                {tractor.brand} on {formatDate(date)} for {acres(numericAcres)}.
              </Text>
              <Text style={styles.confirmAmount}>{money(total)}</Text>
              <Text style={type.meta}>payable after the vendor accepts</Text>
            </Card>
            <Notice icon="wallet-outline" tone="warning" text="No payment is collected in the app. You pay the vendor after the service is confirmed." />
          </>
        ) : null}
        <InlineError message={error} />
      </Screen>
      <StickyFooter>
        {step > 1 ? (
          <Button variant="secondary" onPress={() => { setError(""); setStep(step - 1); }} style={{ flex: 1 }}>
            Back
          </Button>
        ) : null}
        <Button
          loading={loading}
          onPress={step < 5 ? advance : create}
          iconRight={step < 5 ? "arrow-forward" : undefined}
          style={{ flex: step > 1 ? 1.6 : 1 }}
        >
          {loading ? "Sending…" : step < 5 ? "Continue" : "Send request"}
        </Button>
      </StickyFooter>
      <LocationPicker
        visible={picking}
        title="Farm location"
        subtitle="Where should the tractor come?"
        initial={farm}
        onClose={() => setPicking(false)}
        onSelect={(next) => {
          setFarm(next);
          if (!landmark.trim() || landmark === farm?.address) setLandmark(next.address || "");
          setError("");
          setPicking(false);
        }}
        confirmLabel="Use this farm location"
      />
    </>
  );
}

export function AgriAdvice(p) {
  const [kind, setKind] = useState("crop"),
    [notes, setNotes] = useState(""),
    [photos, setPhotos] = useState([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const cases = useResource(p.token, async () => (await apiRequest("/agri-cases", { token: p.token })).cases || []);
  const submit = async () => {
    if (!photos.length) return setError("Add at least one clear photo.");
    if (!notes.trim()) return setError("Describe the crop or soil issue.");
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("type", kind);
      form.append("notes", notes.trim());
      appendPhotos(form, photos, "agri-case");
      const result = await apiRequest("/agri-cases", { method: "POST", token: p.token, body: form });
      cases.setData((current) => [result.case, ...(current || [])]);
      setNotes("");
      setPhotos([]);
      p.notify("Case submitted for review");
    } catch (e) {
      setError(e.message || "Unable to submit your case.");
    } finally {
      setSaving(false);
    }
  };
  const list = cases.data || [];
  return (
    <>
      <Header title="Agri Doctor" subtitle="Free crop and soil advisory" onBack={p.back} />
      <Screen onRefresh={cases.reload} refreshing={cases.loading && !!cases.data}>
        <Notice
          icon="medkit-outline"
          title="Get expert advice for free"
          text="Share clear photos of a crop disease or soil concern. Track your case here while experts review it."
        />
        <Card>
          <Text style={[type.section, { marginBottom: space.md }]}>New request</Text>
          <Segmented
            options={[
              ["crop", "Crop testing", "leaf-outline"],
              ["soil", "Soil testing", "layers-outline"],
            ]}
            value={kind}
            onChange={setKind}
          />
          <PhotoPicker photos={photos} onChange={setPhotos} onError={setError} hint="Close-up, well-lit photos help experts the most." />
          <Field
            label="What needs attention?"
            value={notes}
            onChangeText={setNotes}
            placeholder="Symptoms, crop or soil type, and when you first noticed it"
            multiline
            style={{ marginBottom: 0 }}
          />
          <InlineError message={error} />
          <Button block loading={saving} onPress={submit} icon="send-outline" style={{ marginTop: space.lg }}>
            {saving ? "Submitting…" : "Submit for review"}
          </Button>
        </Card>
        <SectionHeader title="My cases" style={styles.sectionGap} />
        <DataState
          resource={cases}
          loadingLabel="Loading your cases…"
          empty={!!cases.data && !list.length}
          emptyProps={{ icon: "document-text-outline", title: "No cases yet", text: "Your crop and soil requests will appear here." }}
        />
        {list.map((item) => (
          <Card key={item._id}>
            <View style={styles.between}>
              <Badge
                label={item.type === "crop" ? "Crop testing" : "Soil testing"}
                icon={item.type === "crop" ? "leaf-outline" : "layers-outline"}
                tone="primary"
              />
              <StatusBadge status={item.status} />
            </View>
            <Text style={[type.body, { color: colors.text, marginTop: space.md }]}>{item.notes}</Text>
            {item.images?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, marginTop: space.md }}>
                {item.images.map((url) => (
                  <Thumb key={url} uri={url} style={styles.caseThumb} />
                ))}
              </ScrollView>
            ) : null}
            <Text style={[type.meta, { marginTop: space.md }]}>Submitted {formatDate(item.createdAt)}</Text>
            {item.advice ? (
              <Notice icon="chatbubble-ellipses-outline" tone="success" title="Expert advice" text={item.advice} style={{ marginTop: space.md, marginBottom: 0 }} />
            ) : (
              <View style={styles.awaiting}>
                <Icon name="time-outline" size={16} color={colors.warning} />
                <Text style={styles.awaitingText}>Awaiting expert review</Text>
              </View>
            )}
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  homeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  homeName: { fontSize: 20, fontWeight: "800", color: colors.text },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  searchBox: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: space.lg,
  },
  searchPlaceholder: { fontSize: 15, color: colors.placeholder },
  searchInputBox: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: space.lg,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.text, minHeight: 48 },
  hero: { borderRadius: radius.lg, overflow: "hidden", padding: space.xl, justifyContent: "flex-end", marginBottom: space.lg },
  heroImage: { position: "absolute", top: 0, left: 0 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(11,18,32,0.4)" },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800" },
  heroText: { color: "#DBEAFE", fontSize: 14, marginTop: 2, marginBottom: space.md },
  heroButton: { alignSelf: "flex-start" },
  weather: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: space.lg,
  },
  weatherTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  weatherEyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  weatherTemp: { color: colors.text, fontSize: 32, fontWeight: "800", marginTop: 2 },
  weatherMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  weatherIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  weatherStats: { flexDirection: "row", gap: space.lg, marginTop: space.md },
  weatherStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  weatherStatText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  weatherAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
  },
  weatherActionText: { flex: 1, color: colors.primary, fontSize: 14, fontWeight: "700" },
  sectionGap: { marginTop: space.xxl },
  bleed: { marginHorizontal: -space.lg },
  bleedContent: { paddingHorizontal: space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  priceUnit: { fontSize: 13, fontWeight: "600", color: colors.muted },
  areaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    marginBottom: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  areaIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  areaReset: { fontSize: 13, fontWeight: "700", color: colors.muted, marginRight: space.sm },
  areaChange: { fontSize: 14, fontWeight: "800", color: colors.primary },
  resultCount: { ...type.meta, fontWeight: "700", marginBottom: space.sm },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  bookingThumb: { width: 76, height: 76 },
  detailBody: { padding: space.lg },
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
  vendorCard: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    marginBottom: space.xl,
  },
  stepItem: { alignItems: "center", width: 52 },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 14 },
  stepLineDone: { backgroundColor: colors.primary },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNumber: { fontSize: 13, fontWeight: "800", color: colors.muted },
  stepLabel: { fontSize: 11, color: colors.muted, marginTop: 6, fontWeight: "600" },
  stepLabelActive: { color: colors.primary, fontWeight: "800" },
  stepTitle: { marginBottom: space.md },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: space.sm },
  acreRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg },
  acreButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  acreInput: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  dayChip: {
    width: 64,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { fontSize: 11, fontWeight: "700", color: colors.muted },
  dayDate: { fontSize: 20, fontWeight: "800", color: colors.text, marginVertical: 2 },
  dayTextActive: { color: colors.white },
  confirmCard: { alignItems: "center", paddingVertical: space.xxl },
  confirmIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  confirmAmount: { fontSize: 30, fontWeight: "800", color: colors.text, marginTop: space.lg },
  caseThumb: { width: 72, height: 72 },
  awaiting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignSelf: "flex-start",
  },
  awaitingText: { fontSize: 13, fontWeight: "700", color: colors.warning },
});

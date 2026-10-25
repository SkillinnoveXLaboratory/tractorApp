import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "../lib/theme";
import { currentPlace, hasPoint, searchPlaces } from "../lib/location";
import { Button, Field, Icon, InlineError, ListRow, Notice, Sheet } from "./ui";

function PickerBody({ initial, onSelect, onClose, confirmLabel }) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState(null),
    [selected, setSelected] = useState(hasPoint(initial) ? initial : null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const useCurrent = async () => {
    setBusy("gps");
    setError("");
    try {
      setSelected(await currentPlace());
    } catch (e) {
      setError(e.message || "Couldn't get your location.");
    } finally {
      setBusy("");
    }
  };
  const search = async () => {
    if (query.trim().length < 3) return setError("Type at least 3 letters of a village, town or landmark.");
    setBusy("search");
    setError("");
    try {
      const found = await searchPlaces(query);
      setResults(found);
      if (!found.length) setError("No places found. Try adding the district or state.");
    } catch {
      setError("Place search isn't available right now. Use your current location instead.");
    } finally {
      setBusy("");
    }
  };
  const confirm = async () => {
    if (!selected) return setError("Choose your current location or a search result.");
    setBusy("save");
    setError("");
    try {
      await onSelect(selected);
    } catch (e) {
      setError(e.message || "Couldn't save this location.");
      setBusy("");
    }
  };
  return (
    <>
      <Button variant="soft" icon="locate" block loading={busy === "gps"} disabled={!!busy} onPress={useCurrent}>
        Use my current location
      </Button>
      <View style={styles.or}>
        <View style={styles.orLine} />
        <Text style={type.meta}>or search a place</Text>
        <View style={styles.orLine} />
      </View>
      <View style={styles.searchRow}>
        <Field
          icon="search"
          value={query}
          onChangeText={setQuery}
          placeholder="Village, town, district or PIN code"
          returnKeyType="search"
          onSubmitEditing={search}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Button size="sm" variant="secondary" loading={busy === "search"} disabled={!!busy} onPress={search} style={styles.searchButton}>
          Search
        </Button>
      </View>
      {results?.length ? (
        <View style={styles.results}>
          {results.map((place, index) => {
            const active = selected && Math.abs(selected.latitude - place.latitude) < 1e-6 && Math.abs(selected.longitude - place.longitude) < 1e-6;
            return (
              <ListRow
                key={`${place.latitude}-${place.longitude}`}
                icon="location-outline"
                title={place.address}
                subtitle={`${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`}
                last={index === results.length - 1}
                onPress={() => setSelected(place)}
                right={active ? <Icon name="checkmark-circle" size={22} color={colors.success} /> : undefined}
              />
            );
          })}
        </View>
      ) : null}
      {selected ? (
        <Notice icon="pin" tone="success" title="Selected location" text={selected.address || `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`} style={{ marginTop: space.lg }} />
      ) : null}
      <InlineError message={error} />
      <View style={styles.actions}>
        <Button variant="secondary" onPress={onClose} disabled={busy === "save"} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onPress={confirm} loading={busy === "save"} disabled={!selected || (!!busy && busy !== "save")} style={{ flex: 1.6 }}>
          {confirmLabel}
        </Button>
      </View>
    </>
  );
}

// Bottom sheet for choosing a location by GPS or by searching a place name.
// `onSelect` may be async (e.g. saving to the server); errors it throws are shown in the sheet.
export function LocationPicker({ visible, title = "Choose location", subtitle, initial, onSelect, onClose, confirmLabel = "Use this location" }) {
  return (
    <Sheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
      {visible ? <PickerBody initial={initial} onSelect={onSelect} onClose={onClose} confirmLabel={confirmLabel} /> : null}
    </Sheet>
  );
}

// Form row that shows the chosen place and opens the picker.
export function LocationField({ label, value, onPress, placeholder = "Set location", hint, error }) {
  const set = hasPoint(value);
  return (
    <View style={{ marginBottom: space.lg }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.field, error && { borderColor: colors.danger }, pressed && { backgroundColor: colors.background }]}
      >
        <View style={[styles.fieldIcon, set && { backgroundColor: colors.successSoft }]}>
          <Icon name={set ? "location" : "location-outline"} size={18} color={set ? colors.success : colors.primary} />
        </View>
        <Text style={[styles.fieldText, !set && { color: colors.placeholder }]} numberOfLines={2}>
          {set ? value.address || `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}` : placeholder}
        </Text>
        <Text style={styles.fieldAction}>{set ? "Change" : "Set"}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  or: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.lg },
  orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  searchButton: { minHeight: 52 },
  results: {
    marginTop: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  actions: { flexDirection: "row", gap: space.md, marginTop: space.xl },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: space.sm },
  field: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldText: { flex: 1, fontSize: 15, color: colors.text },
  fieldAction: { fontSize: 14, fontWeight: "800", color: colors.primary },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 17 },
  error: { fontSize: 12, color: colors.danger, marginTop: 6, fontWeight: "600" },
});

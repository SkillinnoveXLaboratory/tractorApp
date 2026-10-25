import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, money, space, type } from "../lib/theme";
import { Card } from "./ui";

const CHART_HEIGHT = 120;

// Month labels are formatted on the phone; the totals come from the server.
const monthLabel = (month, options) => new Date(month.year, month.month, 1).toLocaleDateString("en-IN", options);

// Six-month bar chart of server totals. Tap a bar to read that month's value.
// `months`: [{ year, month, total, jobs }]; `noun` names what `jobs` counts ("job", "payment").
export function MonthlyChart({ months, noun = "job", title = "Last 6 months" }) {
  const [selected, setSelected] = useState(months.length - 1);
  const max = Math.max(...months.map((month) => month.total), 1);
  const current = months[selected] || months[months.length - 1];
  if (!current) return null;
  const count = (n) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  return (
    <Card>
      <View style={styles.between}>
        <Text style={type.section}>{title}</Text>
        <Text style={type.meta}>Tap a month</Text>
      </View>
      <View style={styles.readout}>
        <Text style={styles.value}>{money(current.total)}</Text>
        <Text style={type.meta}>
          {monthLabel(current, { month: "long", year: "numeric" })} · {count(current.jobs)}
        </Text>
      </View>
      <View style={styles.chart} accessibilityLabel={`${title}, value per month`}>
        {months.map((month, index) => {
          const active = index === selected;
          const height = month.total ? Math.max(6, Math.round((month.total / max) * CHART_HEIGHT)) : 3;
          return (
            <Pressable
              key={`${month.year}-${month.month}`}
              onPress={() => setSelected(index)}
              accessibilityRole="button"
              accessibilityLabel={`${monthLabel(month, { month: "long", year: "numeric" })}: ${money(month.total)}, ${count(month.jobs)}`}
              accessibilityState={{ selected: active }}
              style={styles.slot}
              hitSlop={4}
            >
              <View style={styles.track}>
                <View style={[styles.bar, { height }, active ? styles.barActive : month.total ? styles.barIdle : styles.barEmpty]} />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{monthLabel(month, { month: "short" })}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  readout: { marginTop: space.md, marginBottom: space.lg },
  value: { fontSize: 24, fontWeight: "800", color: colors.text },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, height: CHART_HEIGHT + 28 },
  slot: { flex: 1, alignItems: "center", minHeight: 44 },
  track: { height: CHART_HEIGHT, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "62%", maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barActive: { backgroundColor: colors.primary },
  barIdle: { backgroundColor: colors.primaryBorder },
  barEmpty: { backgroundColor: colors.divider },
  label: { marginTop: 8, fontSize: 12, color: colors.muted, fontWeight: "600" },
  labelActive: { color: colors.text, fontWeight: "800" },
});

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { colors, formatDate, radius, space, type } from "../lib/theme";
import { Badge, Button, Card, DataState, Field, Header, Icon, InlineError, Notice, Screen, Segmented, StickyFooter } from "../components/ui";

// Vendors and shopkeepers add the bank account or UPI ID where Cashfree settles their share of online payments.
// Full account numbers and PAN go to the server once, which passes them to Cashfree and keeps only masked copies.

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ACCOUNT_NUMBER = /^\d{9,18}$/;
const VPA = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.]{1,64}$/;
const HOLDER = /^[A-Za-z][A-Za-z .&/-]{1,99}$/;

const METHODS = [
  ["bank", "Bank account", "business-outline"],
  ["upi", "UPI ID", "phone-portrait-outline"],
];
const STATUS = {
  pending: ["warning", "Verifying", "time-outline", "Cashfree is checking your details. This usually takes a few minutes."],
  active: ["success", "Active", "checkmark-circle", "Farmers can pay you online. Your share settles straight to this account."],
  action_required: ["danger", "Needs attention", "alert-circle", "Cashfree couldn't verify these details. Check them and save again."],
  blocked: ["danger", "Paused", "close-circle", "Payouts to this account are paused. Please contact AgroTrack support."],
};

function validate(form) {
  if (!HOLDER.test(form.accountHolder.trim())) return "Enter the account holder's name exactly as on the bank account.";
  if (form.method === "bank") {
    const number = form.accountNumber.replace(/\s+/g, "");
    if (!ACCOUNT_NUMBER.test(number)) return "Enter a valid bank account number (9–18 digits).";
    if (number !== form.confirmAccountNumber.replace(/\s+/g, "")) return "The two account numbers don't match.";
    if (!IFSC.test(form.ifsc.trim().toUpperCase())) return "Enter a valid 11-character IFSC (e.g. SBIN0001234).";
  } else if (!VPA.test(form.vpa.trim())) return "Enter a valid UPI ID (e.g. name@okaxis).";
  if (!PAN.test(form.pan.trim().toUpperCase())) return "Enter a valid 10-character PAN (e.g. ABCDE1234F).";
  if (!form.consent) return "Please confirm the details and agree to receive payouts through Cashfree.";
  return "";
}

// `onboarding`: shown right after sign-up, with "Skip for now" instead of Back.
export function Payouts(p) {
  const onboarding = !!p.onboarding;
  const res = useResource(p.token, () => apiRequest("/payouts/account", { token: p.token }));
  const account = res.data?.account;
  const [editing, setEditing] = useState(false),
    [saving, setSaving] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(""),
    [form, setForm] = useState({ method: "bank", accountHolder: p.user?.fullName || "", accountNumber: "", confirmAccountNumber: "", ifsc: "", vpa: "", pan: "", consent: false });
  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };
  const showForm = editing || (res.data && !account);
  const status = account ? STATUS[account.status] || STATUS.pending : null;

  const save = async () => {
    const problem = validate(form);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      const body = {
        method: form.method,
        accountHolder: form.accountHolder.trim(),
        pan: form.pan.trim().toUpperCase(),
        consent: true,
        ...(form.method === "bank"
          ? { accountNumber: form.accountNumber.replace(/\s+/g, ""), confirmAccountNumber: form.confirmAccountNumber.replace(/\s+/g, ""), ifsc: form.ifsc.trim().toUpperCase() }
          : { vpa: form.vpa.trim() }),
      };
      const result = await apiRequest("/payouts/account", { method: "PUT", token: p.token, body });
      // Clear sensitive fields as soon as they are sent.
      setForm((current) => ({ ...current, accountNumber: "", confirmAccountNumber: "", pan: "", consent: false }));
      setEditing(false);
      res.setData((current) => ({ ...(current || {}), account: result.account }));
      p.notify?.(result.message, 4000);
      if (onboarding) p.onDone?.();
    } catch (e) {
      setError(e.message || "Couldn't save your payout details.");
    } finally {
      setSaving(false);
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      const result = await apiRequest("/payouts/account?refresh=1", { token: p.token });
      res.setData(result);
      p.notify?.(result.account?.status === "active" ? "Your payout account is active." : "Still being verified. We'll notify you when it's done.");
    } catch (e) {
      p.notify?.(e.message);
    } finally {
      setChecking(false);
    }
  };

  const pct = res.data?.commissionPercent;
  return (
    <>
      <Header title={onboarding ? "Get paid online" : "Payouts"} subtitle={onboarding ? "Step 2 of 2 · you can do this later" : "Where your online payments go"} onBack={onboarding ? undefined : p.back} />
      <Screen footer>
        {onboarding ? (
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Icon name="wallet" size={26} color={colors.primary} />
            </View>
            <Text style={type.title}>Receive money straight to your bank</Text>
            <Text style={[type.body, { marginTop: space.xs }]}>
              Farmers pay in the app and AgroTrack settles your share to your bank or UPI automatically through Cashfree. No cash collection, no waiting.
            </Text>
          </View>
        ) : null}
        <DataState resource={res} loadingLabel="Loading payout details…" />

        {res.data && !res.data.onlinePaymentsEnabled ? <Notice tone="warning" icon="pause-circle-outline" text="Online payments are switched off right now. Farmers pay you directly until they're back on." /> : null}
        {res.data ? (
          <Notice
            icon="pricetag-outline"
            title={pct ? `Platform fee: ${pct}% per online payment` : "No platform fee right now"}
            text={pct ? `Example: on ₹1,000 you receive ₹${(1000 - Math.round(1000 * pct) / 100).toLocaleString("en-IN")}. Cashfree settles your share to your account, usually within 1–2 working days.` : "You receive the full amount of each online payment, usually within 1–2 working days."}
          />
        ) : null}

        {account && !editing ? (
          <Card style={styles.accountCard}>
            <View style={styles.accountTop}>
              <View style={styles.accountIcon}>
                <Icon name={account.method === "bank" ? "business-outline" : "phone-portrait-outline"} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle}>{account.method === "bank" ? account.accountMasked : account.vpaMasked}</Text>
                <Text style={type.meta}>{account.method === "bank" ? `IFSC ${account.ifsc}` : "UPI"} · {account.accountHolder}</Text>
              </View>
              <Badge label={status[1]} tone={status[0]} icon={status[2]} />
            </View>
            <Text style={[type.meta, { marginTop: space.md }]}>{status[3]}</Text>
            {account.remarks ? <Text style={styles.remarks}>{account.remarks}</Text> : null}
            <Text style={[type.meta, { marginTop: space.sm }]}>PAN {account.panMasked}{account.activatedAt ? ` · Active since ${formatDate(account.activatedAt)}` : ""}</Text>
            <View style={styles.actions}>
              {account.status !== "active" ? (
                <Button variant="soft" icon="refresh" loading={checking} onPress={check} style={{ flex: 1 }}>
                  Check status
                </Button>
              ) : null}
              <Button variant="secondary" icon="create-outline" onPress={() => { setEditing(true); setForm((f) => ({ ...f, method: account.method, accountHolder: account.accountHolder })); }} style={{ flex: 1 }}>
                Change
              </Button>
            </View>
          </Card>
        ) : null}

        {showForm ? (
          <>
            <Text style={styles.groupTitle}>{account ? "New payout details" : "Payout details"}</Text>
            {account ? <Notice tone="warning" icon="information-circle-outline" text="New details are verified again before online payments resume." /> : null}
            <Segmented options={METHODS} value={form.method} onChange={(method) => set({ method })} />
            <Field label="Account holder name" icon="person-outline" value={form.accountHolder} onChangeText={(accountHolder) => set({ accountHolder })} placeholder="As printed on your passbook" autoCapitalize="words" maxLength={100} />
            {form.method === "bank" ? (
              <>
                <Field label="Account number" icon="card-outline" value={form.accountNumber} onChangeText={(accountNumber) => set({ accountNumber: accountNumber.replace(/[^\d ]/g, "") })} placeholder="9–18 digits" keyboardType="number-pad" secure maxLength={22} />
                <Field label="Confirm account number" icon="card-outline" value={form.confirmAccountNumber} onChangeText={(confirmAccountNumber) => set({ confirmAccountNumber: confirmAccountNumber.replace(/[^\d ]/g, "") })} placeholder="Type it again" keyboardType="number-pad" maxLength={22} />
                <Field label="IFSC" icon="business-outline" value={form.ifsc} onChangeText={(ifsc) => set({ ifsc: ifsc.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="e.g. SBIN0001234" autoCapitalize="characters" maxLength={11} hint="Printed on your cheque book or passbook." />
              </>
            ) : (
              <Field label="UPI ID" icon="at-outline" value={form.vpa} onChangeText={(vpa) => set({ vpa: vpa.trim() })} placeholder="name@okaxis" autoCapitalize="none" maxLength={100} hint="Must be linked to a bank account in the same name." />
            )}
            <Field label="PAN" icon="id-card-outline" value={form.pan} onChangeText={(pan) => set({ pan: pan.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} hint="Required by RBI for payouts. Only the last digits are kept in AgroTrack." />
            <Pressable
              onPress={() => set({ consent: !form.consent })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.consent }}
              style={styles.consent}
            >
              <Icon name={form.consent ? "checkbox" : "square-outline"} size={22} color={form.consent ? colors.primary : colors.subtle} />
              <Text style={[type.meta, { flex: 1, color: colors.textSecondary }]}>
                These details are mine and correct. I agree to receive payouts through Cashfree Payments and that AgroTrack keeps its platform fee from each online payment.
              </Text>
            </Pressable>
            <InlineError message={error} />
            <View style={styles.secure}>
              <Icon name="lock-closed" size={14} color={colors.success} />
              <Text style={[type.meta, { flex: 1 }]}>Sent securely to Cashfree (RBI-licensed payment aggregator). AgroTrack never shows or stores your full account number.</Text>
            </View>
          </>
        ) : null}
      </Screen>
      <StickyFooter>
        {onboarding ? (
          <Button variant="secondary" onPress={p.onSkip} disabled={saving} style={{ flex: 1 }}>
            {account ? "Continue" : "Skip for now"}
          </Button>
        ) : editing ? (
          <Button variant="secondary" onPress={() => { setEditing(false); setError(""); }} disabled={saving} style={{ flex: 1 }}>
            Cancel
          </Button>
        ) : null}
        {showForm ? (
          <Button loading={saving} onPress={save} icon="shield-checkmark-outline" style={{ flex: 1.6 }}>
            {saving ? "Verifying…" : "Save & verify"}
          </Button>
        ) : !onboarding ? (
          <Button variant="secondary" onPress={p.back} style={{ flex: 1 }}>
            Done
          </Button>
        ) : null}
      </StickyFooter>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "flex-start", marginBottom: space.lg },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: space.md },
  groupTitle: { ...type.overline, marginTop: space.lg, marginBottom: space.sm, marginLeft: space.xs },
  accountCard: { marginTop: space.md },
  accountTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  accountIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  remarks: { ...type.meta, color: colors.danger, marginTop: space.xs },
  actions: { flexDirection: "row", gap: space.md, marginTop: space.lg },
  consent: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", marginTop: space.md, paddingVertical: space.xs },
  secure: { flexDirection: "row", gap: space.xs, alignItems: "center", marginTop: space.md },
});

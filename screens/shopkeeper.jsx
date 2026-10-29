import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { colors, formatDate, money, productStatus, radius, shadow, shortId, space, type } from "../lib/theme";
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
  QuickAction,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
  StatTile,
  StatusBadge,
  StickyFooter,
  useLockGuard,
} from "../components/ui";
import { appendPhotos, Gallery, PhotoPicker, Thumb } from "../components/media";
import { DrawerMenu, NAV_FAB_OFFSET } from "../components/shell";
import { MonthlyChart } from "../components/charts";

const OPEN_ORDER = ["placed", "confirmed", "packed", "out_for_delivery"];

function ProductForm({ product, token, onSaved, onCancel }) {
  const editing = !!product?._id;
  const [name, setName] = useState(product?.name || ""),
    [description, setDescription] = useState(product?.description || ""),
    [price, setPrice] = useState(product?.price != null ? String(product.price) : ""),
    [unit, setUnit] = useState(product?.unit || "kg"),
    [existing, setExisting] = useState(product?.images || []),
    [photos, setPhotos] = useState([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (!name.trim()) return setError("Enter the product name.");
    if (!description.trim()) return setError("Add a short description.");
    if (price === "" || !Number.isFinite(Number(price)) || Number(price) < 0) return setError("Enter a valid price.");
    if (!existing.length && !photos.length) return setError("Add at least one product photo.");
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("price", String(Number(price)));
      form.append("unit", unit);
      if (editing) form.append("existingImages", JSON.stringify(existing));
      appendPhotos(form, photos, "product");
      const data = await apiRequest(editing ? `/products/${product._id}` : "/products", {
        method: editing ? "PATCH" : "POST",
        token,
        body: form,
      });
      onSaved(data.product, data.message);
    } catch (e) {
      setError(e.message || "Unable to save this product.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PhotoPicker
        label="Product photos"
        existing={existing}
        onRemoveExisting={(url) => setExisting((list) => list.filter((item) => item !== url))}
        photos={photos}
        onChange={setPhotos}
        onError={setError}
        hint={editing ? "Removed photos are deleted when you save." : undefined}
        addIcon="images-outline"
      />
      <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Organic basmati rice" />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Variety, quality, packing and freshness"
        multiline
      />
      <Field label="Price" prefix="₹" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
      <Text style={styles.fieldLabel}>Sold per</Text>
      <Segmented
        options={[
          ["kg", "Kilogram (kg)"],
          ["gram", "Gram (g)"],
        ]}
        value={unit}
        onChange={setUnit}
      />
      <InlineError message={error} />
      <View style={styles.formActions}>
        <Button variant="secondary" onPress={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button loading={saving} onPress={submit} style={{ flex: 1.6 }}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
        </Button>
      </View>
    </>
  );
}

export function ProductFormSheet({ visible, product, token, onClose, onSaved }) {
  return (
    <Sheet
      visible={visible}
      title={product?._id ? "Edit product" : "Add product"}
      subtitle={product?._id ? "Update details, price or photos" : "List a new product in your shop"}
      onClose={onClose}
    >
      {visible ? <ProductForm key={product?._id || "new"} product={product} token={token} onSaved={onSaved} onCancel={onClose} /> : null}
    </Sheet>
  );
}

function ProductRow({ product, onPress }) {
  return (
    <Card onPress={onPress} style={styles.productRow}>
      <Thumb uri={product.images?.[0]} style={styles.productThumb} icon="basket-outline" />
      <View style={{ flex: 1 }}>
        <Text style={type.cardTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={type.meta} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={[styles.between, { marginTop: space.sm }]}>
          <Text style={styles.price}>
            {money(product.price)}
            <Text style={styles.unit}> / {product.unit}</Text>
          </Text>
          <StatusBadge status={productStatus(product)} />
        </View>
        {product.status === "rejected" && product.rejectionReason ? (
          <Text style={styles.rejectNote} numberOfLines={2}>
            {product.rejectionReason}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function ShopHome(p) {
  const [drawer, setDrawer] = useState(false),
    [adding, setAdding] = useState(false);
  const res = useResource(p.token, async () => {
    const [productData, orderData, earnData] = await Promise.all([
      apiRequest("/products/mine", { token: p.token }),
      apiRequest("/orders", { token: p.token }),
      apiRequest(`/shop/earnings?period=month&tz=${new Date().getTimezoneOffset()}`, { token: p.token }),
    ]);
    const mine = (orderData.orders || []).filter((order) => {
      const seller = typeof order.seller === "object" ? order.seller?._id : order.seller;
      return String(seller) === String(p.user?.id);
    });
    return { products: productData.products || [], orders: mine, earnings: earnData.summary || {} };
  });
  const data = res.data || { products: [], orders: [] };
  const open = data.orders.filter((order) => OPEN_ORDER.includes(order.status));
  const ready = !!res.data;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.top}>
        <IconButton icon="menu" onPress={() => setDrawer(true)} accessibilityLabel="Open menu" />
        <View style={{ flex: 1 }}>
          <Text style={type.meta}>My shop</Text>
          <Text style={styles.topName} numberOfLines={1}>
            {p.user?.fullName || "Shopkeeper"}
          </Text>
        </View>
        <Pressable onPress={() => p.go("profile")} accessibilityRole="button" accessibilityLabel="Open profile">
          <Avatar name={p.user?.fullName} uri={p.user?.avatarUrl} />
        </Pressable>
      </View>
      <Screen tab onRefresh={res.reload} refreshing={res.loading && ready}>
        {res.error && !ready ? <DataState resource={res} /> : null}
        <View style={styles.stats}>
          <StatTile label="Products" value={ready ? data.products.length : "—"} icon="pricetags-outline" tone="primary" />
          <StatTile label="To fulfil" value={ready ? open.length : "—"} icon="time-outline" tone="warning" />
          <StatTile label="Total orders" value={ready ? data.orders.length : "—"} icon="cube-outline" tone="violet" />
          <StatTile
            label="Received this month"
            value={ready ? money(data.earnings?.total) : "—"}
            hint={ready && data.earnings?.awaitingCount ? `${data.earnings.awaitingCount} to verify` : undefined}
            icon="wallet-outline"
            tone="success"
          />
        </View>
        <View style={styles.quickRow}>
          <QuickAction icon="add-circle-outline" label="Add product" onPress={() => setAdding(true)} />
          <QuickAction icon="pricetags-outline" label="My products" onPress={() => p.go("myProducts")} tone="violet" />
          <QuickAction icon="cube-outline" label="Orders" onPress={() => p.go("orders")} tone="warning" />
        </View>
        <SectionHeader title="Orders to fulfil" onAction={data.orders.length ? () => p.go("orders") : undefined} style={styles.sectionGap} />
        {res.loading && !ready ? <DataState resource={res} loadingLabel="Loading your shop…" /> : null}
        {ready && !open.length ? (
          <EmptyState compact icon="checkmark-done-outline" title="All caught up" text="New orders from farmers will show up here." />
        ) : null}
        {open.slice(0, 4).map((order) => (
          <Card key={order._id} onPress={() => p.go("orderDetail", order)} style={styles.orderRow}>
            <Thumb uri={order.items?.[0]?.image} style={styles.orderThumb} icon="cube-outline" />
            <View style={{ flex: 1 }}>
              <View style={styles.between}>
                <Text style={type.cardTitle}>#{shortId(order._id)}</Text>
                <Text style={styles.price}>{money(order.amount)}</Text>
              </View>
              <Text style={type.meta} numberOfLines={1}>
                {order.buyer?.fullName || "Customer"} · {order.items?.length || 0} item(s) · {formatDate(order.createdAt)}
              </Text>
              <StatusBadge status={order.status} style={{ marginTop: space.sm }} />
            </View>
          </Card>
        ))}
        <SectionHeader title="Your products" onAction={data.products.length ? () => p.go("myProducts") : undefined} style={styles.sectionGap} />
        {ready && !data.products.length ? (
          <EmptyState
            compact
            icon="basket-outline"
            title="No products yet"
            text="Add your first product so farmers can buy from you."
            actionLabel="Add product"
            onAction={() => setAdding(true)}
          />
        ) : null}
        {data.products.slice(0, 3).map((product) => (
          <ProductRow key={product._id} product={product} onPress={() => p.go("myProductDetail", product)} />
        ))}
      </Screen>
      <ProductFormSheet
        visible={adding}
        token={p.token}
        onClose={() => setAdding(false)}
        onSaved={(product, message) => {
          setAdding(false);
          res.setData((current) => (current ? { ...current, products: [product, ...current.products] } : current));
          p.notify(message || "Product added to your shop");
        }}
      />
      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} user={p.user} go={p.go} signOut={p.signOut} current="home" />
    </View>
  );
}

export function MyProducts(p) {
  const { locked, guard } = useLockGuard();
  const [q, setQ] = useState(""),
    [adding, setAdding] = useState(false);
  const res = useResource(p.token, async () => (await apiRequest("/products/mine", { token: p.token })).products || []);
  const term = q.trim().toLowerCase();
  const list = (res.data || []).filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(term));
  return (
    <>
      <Header
        title="My products"
        subtitle={res.data ? `${res.data.length} listed` : undefined}
        onBack={p.isTab ? undefined : p.back}
        right={<IconButton icon="add" tone="soft" color={colors.primary} onPress={() => setAdding(true)} accessibilityLabel="Add product" />}
      />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        {res.data?.length ? (
          <View style={styles.search}>
            <Icon name="search" size={19} color={colors.subtle} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search your products"
              placeholderTextColor={colors.placeholder}
              style={styles.searchInput}
            />
          </View>
        ) : null}
        <DataState
          resource={res}
          loadingLabel="Loading your products…"
          empty={!!res.data && !list.length}
          emptyProps={
            term
              ? { icon: "search-outline", title: "No matches", text: `None of your products match “${q}”.` }
              : {
                  icon: "basket-outline",
                  title: "No products yet",
                  text: "Add photos, a price and a description to start selling.",
                  actionLabel: "Add your first product",
                  onAction: () => setAdding(true),
                }
          }
        />
        {list.map((product) => (
          <ProductRow key={product._id} product={product} onPress={() => p.go("myProductDetail", product)} />
        ))}
      </Screen>
      {res.data?.length ? (
        <Pressable style={[styles.fab, { bottom: NAV_FAB_OFFSET }]} onPress={guard(() => setAdding(true))} accessibilityRole="button" accessibilityLabel={locked ? "Add product, locked" : "Add product"}>
          <Icon name={locked ? "lock-closed" : "add"} size={22} color={colors.white} />
          <Text style={styles.fabText}>Add product</Text>
        </Pressable>
      ) : null}
      <ProductFormSheet
        visible={adding}
        token={p.token}
        onClose={() => setAdding(false)}
        onSaved={(product, message) => {
          setAdding(false);
          res.setData((current) => [product, ...(current || [])]);
          p.notify(message || "Product added to your shop");
        }}
      />
    </>
  );
}

export function MyProductDetail(p) {
  const [current, setCurrent] = useState(p.product || {}),
    [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false);
  const remove = () =>
    Alert.alert("Delete this product?", `${current.name} and its photos will be removed permanently.`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await apiRequest(`/products/${current._id}`, { method: "DELETE", token: p.token });
            p.notify("Product deleted");
            p.back();
          } catch (e) {
            p.notify(e.message);
            setDeleting(false);
          }
        },
      },
    ]);
  return (
    <>
      <Header title="Product details" subtitle={`ID ${shortId(current._id)}`} onBack={p.back} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Gallery images={current.images || []} icon="basket-outline" />
        <View style={{ padding: space.lg }}>
          <StatusBadge status={productStatus(current)} />
          <Text style={[type.title, { marginTop: space.sm }]}>{current.name}</Text>
          <View style={styles.pricePanel}>
            <View>
              <Text style={type.overline}>Your selling price</Text>
              <Text style={styles.bigPrice}>
                {money(current.price)}
                <Text style={styles.unit}> / {current.unit}</Text>
              </Text>
            </View>
            <View style={styles.priceIcon}>
              <Icon name="pricetag" size={22} color={colors.primary} />
            </View>
          </View>
          {current.status === "rejected" ? (
            <Card style={styles.rejectCard}>
              <Text style={[type.section, { color: colors.danger, marginBottom: space.xs }]}>Changes requested</Text>
              <Text style={type.body}>{current.rejectionReason || "The AgroTrack team asked for changes to this product."}</Text>
              <Text style={[type.meta, { marginTop: space.sm }]}>Edit the product to send it for review again.</Text>
            </Card>
          ) : null}
          <Card>
            <Text style={[type.section, { marginBottom: space.sm }]}>Description</Text>
            <Text style={type.body}>{current.description}</Text>
          </Card>
          <Card>
            <KeyValue label="Visibility" value={!current.status || current.status === "active" ? "Visible to buyers" : current.status === "rejected" ? "Hidden — changes requested" : "Waiting for review"} />
            <KeyValue label="Photos" value={`${current.images?.length || 0} of 6`} />
            <KeyValue label="Sold per" value={current.unit === "gram" ? "Gram" : "Kilogram"} />
            <KeyValue label="Last updated" value={formatDate(current.updatedAt || current.createdAt)} last />
          </Card>
        </View>
      </ScrollView>
      <StickyFooter>
        <Button variant="dangerSoft" icon="trash-outline" loading={deleting} onPress={remove} style={{ flex: 1 }}>
          Delete
        </Button>
        <Button icon="create-outline" onPress={() => setEditing(true)} style={{ flex: 1.6 }}>
          Edit product
        </Button>
      </StickyFooter>
      <ProductFormSheet
        visible={editing}
        product={current}
        token={p.token}
        onClose={() => setEditing(false)}
        onSaved={(product) => {
          setCurrent(product);
          setEditing(false);
          p.notify(product.status === "pending" ? "Product sent for review" : "Product updated");
        }}
      />
    </>
  );
}

const EARNING_PERIODS = [
  ["week", "This week"],
  ["month", "This month"],
  ["all", "All time"],
];

const MODE = {
  upi: { label: "UPI", icon: "phone-portrait-outline", color: colors.primary },
  cod: { label: "Cash", icon: "cash-outline", color: colors.violet },
  online: { label: "Online", icon: "card-outline", color: colors.success },
};

const itemCount = (order) => (order.items || []).reduce((n, item) => n + Number(item.quantity || 0), 0);

// How received money splits between online, cash and UPI: one bar, each mode labelled with value and share.
// Online amounts are the shop’s share after the platform fee.
function PaymentModes({ byMethod, total, commission }) {
  const rows = ["online", "upi", "cod"].map((key) => byMethod.find((entry) => entry.method === key) || { method: key, total: 0, count: 0 });
  return (
    <Card>
      <Text style={[type.section, { marginBottom: space.md }]}>Payment modes</Text>
      <View style={styles.modeBar} accessibilityLabel="Share of received money by payment mode">
        {total > 0 ? (
          rows
            .filter((row) => row.total > 0)
            .map((row) => <View key={row.method} style={{ flex: row.total, backgroundColor: MODE[row.method].color }} />)
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.divider }} />
        )}
      </View>
      {rows.map((row, index) => {
        const share = total > 0 ? Math.round((row.total / total) * 100) : 0;
        return (
          <View key={row.method} style={[styles.modeRow, index === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.modeSwatch, { backgroundColor: MODE[row.method].color }]} />
            <Icon name={MODE[row.method].icon} size={18} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle}>{MODE[row.method].label}</Text>
              <Text style={type.meta}>
                {row.count} payment{row.count === 1 ? "" : "s"} · {share}%
              </Text>
            </View>
            <Text style={styles.modeValue}>{money(row.total)}</Text>
          </View>
        );
      })}
      {commission > 0 ? <Text style={[type.meta, { marginTop: space.sm }]}>Online payments are shown after the platform fee ({money(commission)} this period).</Text> : null}
    </Card>
  );
}

// Shop earnings: every figure comes from GET /api/shop/earnings. Only payments the shopkeeper
// verified count as received; delivered-but-unverified orders are listed separately.
export function ShopEarnings(p) {
  const [period, setPeriod] = useState("month");
  const tz = new Date().getTimezoneOffset();
  const res = useResource(`${p.token}:${period}`, () => apiRequest(`/shop/earnings?period=${period}&tz=${tz}`, { token: p.token }));
  const data = res.data;
  const ready = !!data;
  const s = data?.summary || {};
  const stale = ready && data.period !== period;
  const periodLabel = EARNING_PERIODS.find(([key]) => key === period)[1].toLowerCase();
  const payments = data?.payments || [];
  const awaiting = data?.awaiting || [];
  return (
    <>
      <Header title="Earnings" subtitle="Payments you have verified" onBack={p.isTab ? undefined : p.back} />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && ready}>
        <View style={[styles.earnHero, stale && styles.stale]}>
          <View style={styles.earnHeroGlow} />
          <Text style={styles.earnHeroLabel}>Received {periodLabel}</Text>
          <Text style={styles.earnHeroValue}>{ready ? money(s.total) : "—"}</Text>
          <Text style={styles.earnHeroMeta}>
            {ready ? `From ${s.payments} verified payment${s.payments === 1 ? "" : "s"}` : "Loading your earnings…"}
          </Text>
          <View style={styles.earnHeroDivider} />
          <View style={styles.between}>
            <View style={styles.heroRow}>
              <Icon name="hourglass-outline" size={16} color="#FDE68A" />
              <Text style={styles.earnHeroMeta}>
                Awaiting payment{ready && s.awaitingCount ? ` · ${s.awaitingCount} order${s.awaitingCount === 1 ? "" : "s"}` : ""}
              </Text>
            </View>
            <Text style={styles.heroPending}>{ready ? money(s.awaitingTotal) : "—"}</Text>
          </View>
        </View>
        <Segmented options={EARNING_PERIODS} value={period} onChange={setPeriod} style={{ marginTop: space.lg }} />
        {res.error && !ready ? <DataState resource={res} /> : null}
        <View style={[styles.stats, { marginBottom: space.md }, stale && styles.stale]}>
          <StatTile label="Payments received" value={ready ? s.payments : "—"} icon="checkmark-done-outline" tone="success" />
          <StatTile label="Average order" value={ready ? money(s.average) : "—"} icon="trending-up-outline" tone="primary" />
          <StatTile label="Items sold" value={ready ? s.itemsSold : "—"} icon="basket-outline" tone="violet" />
          <StatTile label="Orders in progress" value={ready ? s.openCount : "—"} hint={ready && s.openCount ? `${money(s.openTotal)} on the way` : undefined} icon="cube-outline" tone="warning" />
        </View>
        {ready && s.lifetimePayments ? <PaymentModes byMethod={data.byMethod || []} total={s.total} commission={s.commission || 0} /> : null}
        {ready && s.lifetimePayments ? <MonthlyChart months={data.months || []} noun="payment" /> : null}
        {awaiting.length ? (
          <>
            <SectionHeader title={`Verify payments (${awaiting.length})`} style={styles.sectionGap} />
            {awaiting.map((order) => (
              <Card key={order._id} onPress={() => p.go("orderDetail", order)} style={[styles.payRow, styles.payRowPending]}>
                <View style={[styles.payIcon, { backgroundColor: colors.warningSoft }]}>
                  <Icon name="hourglass-outline" size={20} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.between}>
                    <Text style={type.cardTitle}>#{shortId(order._id)}</Text>
                    <Text style={styles.payPending}>{money(order.amount)}</Text>
                  </View>
                  <Text style={type.meta} numberOfLines={1}>
                    {order.buyer?.fullName || "Customer"} · chose {MODE[order.paymentMethod]?.label || "cash"} on delivery
                  </Text>
                  <Text style={styles.verifyLink}>Delivered · tap to verify payment</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}
        <SectionHeader title="Payments received" style={styles.sectionGap} />
        {res.loading && !ready ? <DataState resource={res} loadingLabel="Loading your earnings…" /> : null}
        {ready && !stale && !payments.length ? (
          <EmptyState
            compact
            icon="wallet-outline"
            title={s.lifetimePayments ? `No payments ${periodLabel}` : "No payments yet"}
            text={
              s.lifetimePayments
                ? "Switch to All time to see earlier payments."
                : "After delivery, open the order and verify the payment. It will appear here."
            }
          />
        ) : null}
        {payments.map((order) => {
          const mode = MODE[order.paidVia] || MODE.cod;
          return (
            <Card key={order._id} onPress={() => p.go("orderDetail", order)} style={[styles.payRow, stale && styles.stale]}>
              <View style={[styles.payIcon, { backgroundColor: order.paidVia === "online" ? colors.successSoft : order.paidVia === "upi" ? colors.primarySoft : colors.violetSoft }]}>
                <Icon name={mode.icon} size={20} color={mode.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.between}>
                  <Text style={type.cardTitle}>#{shortId(order._id)}</Text>
                  <Text style={styles.payAmount}>+{money(order.net ?? order.amount)}</Text>
                </View>
                <Text style={type.meta} numberOfLines={1}>
                  {order.buyer?.fullName || "Customer"} · {itemCount(order)} item{itemCount(order) === 1 ? "" : "s"}
                </Text>
                <View style={styles.payMeta}>
                  <Icon name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={type.meta} numberOfLines={1}>
                    {mode.label} · {formatDate(order.paymentReceivedAt)}
                    {order.paidVia === "online" ? ` · ${money(order.amount)} paid, fee ${money(order.online?.commission)}` : order.paymentReference ? ` · Ref ${order.paymentReference}` : ""}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stale: { opacity: 0.6 },
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
  heroRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  heroPending: { color: "#FDE68A", fontSize: 16, fontWeight: "800" },
  modeBar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 2, marginBottom: space.sm, backgroundColor: colors.surface },
  modeRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modeSwatch: { width: 10, height: 10, borderRadius: 5 },
  modeValue: { fontSize: 16, fontWeight: "800", color: colors.text },
  payRow: { flexDirection: "row", gap: space.md, padding: space.md, alignItems: "center" },
  payRowPending: { borderColor: colors.warningBorder },
  payIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  payAmount: { fontSize: 16, fontWeight: "800", color: colors.success },
  payPending: { fontSize: 16, fontWeight: "800", color: colors.warning },
  payMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  verifyLink: { marginTop: 4, fontSize: 13, fontWeight: "700", color: colors.warning },
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
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  quickRow: { flexDirection: "row", gap: space.md, marginTop: space.md },
  sectionGap: { marginTop: space.xxl },
  orderRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  orderThumb: { width: 60, height: 60 },
  productRow: { flexDirection: "row", gap: space.md, padding: space.md },
  rejectNote: { marginTop: space.xs, fontSize: 12, color: colors.danger },
  rejectCard: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerSoft },
  productThumb: { width: 92, height: 92 },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  unit: { fontSize: 13, fontWeight: "600", color: colors.muted },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: space.sm },
  formActions: { flexDirection: "row", gap: space.md, marginTop: space.xl },
  search: {
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
  priceIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});

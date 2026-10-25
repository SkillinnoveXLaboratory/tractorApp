import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "../lib/api";
import { useResource } from "../lib/hooks";
import { colors, formatDate, money, radius, shortId, space, statusInfo, type } from "../lib/theme";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
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
  Sheet,
  StatusBadge,
  StickyFooter,
} from "../components/ui";
import { Gallery, Thumb } from "../components/media";
import { addToCart, MAX_QTY, ProductCard, toMarketplaceProduct, TractorCard } from "../components/cards";


const cartCount = (cart) => cart.reduce((sum, line) => sum + line.qty, 0);
const cartTotal = (cart) => cart.reduce((sum, line) => sum + line.price * line.qty, 0);

function SearchInput({ value, onChangeText, placeholder, autoFocus }) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={19} color={colors.subtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={styles.searchInput}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} accessibilityLabel="Clear search">
          <Icon name="close-circle" size={18} color={colors.subtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const SORTS = [
  ["newest", "Newest"],
  ["low", "Price: low to high"],
  ["high", "Price: high to low"],
];

export function MarketplaceShop(p) {
  const [q, setQ] = useState(""),
    [sort, setSort] = useState("newest");
  const res = useResource(p.token, async () =>
    ((await apiRequest("/products", { token: p.token })).products || []).map(toMarketplaceProduct),
  );
  const term = q.trim().toLowerCase();
  const list = (res.data || [])
    .filter((item) => `${item.name} ${item.seller} ${item.description || ""}`.toLowerCase().includes(term))
    .sort((a, b) => (sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : 0));
  const count = cartCount(p.cart);
  return (
    <>
      <Header
        title="Marketplace"
        subtitle="Fresh produce and farm supplies"
        onBack={p.isTab ? undefined : p.back}
        right={<IconButton icon="bag-outline" badge={count} onPress={() => p.go("cart")} accessibilityLabel={`Cart, ${count} items`} />}
      />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search products or sellers" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {SORTS.map(([key, label]) => (
            <Chip key={key} label={label} active={sort === key} onPress={() => setSort(key)} />
          ))}
        </ScrollView>
        <DataState
          resource={res}
          loadingLabel="Loading products…"
          empty={!!res.data && !list.length}
          emptyProps={
            term
              ? { icon: "search-outline", title: "No matches", text: `Nothing matches “${q}”.` }
              : { icon: "basket-outline", title: "No products yet", text: "Shopkeepers haven’t listed products yet. Pull down to refresh." }
          }
        />
        <View style={styles.grid}>
          {list.map((item) => (
            <ProductCard key={item.id} product={item} {...p} />
          ))}
        </View>
      </Screen>
    </>
  );
}

export function ProductDetail(p) {
  const item = p.product ? toMarketplaceProduct(p.product) : null;
  const [qty, setQty] = useState(1);
  if (!item)
    return (
      <>
        <Header title="Product" onBack={p.back} />
        <Screen>
          <EmptyState icon="basket-outline" title="Product not found" text="Go back and choose a product." />
        </Screen>
      </>
    );
  const liked = p.wish?.products?.includes(item.id);
  const inCart = p.cart.find((line) => line.id === item.id)?.qty || 0;
  const add = () => {
    p.setCart(addToCart(p.cart, item, qty));
    p.notify(`${qty} × ${item.name} added to cart`);
  };
  return (
    <>
      <Header
        title="Product details"
        onBack={p.back}
        right={<IconButton icon="bag-outline" badge={cartCount(p.cart)} onPress={() => p.go("cart")} accessibilityLabel="Open cart" />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Gallery images={item.images} icon="basket-outline" />
        <View style={styles.detailBody}>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <Text style={type.title}>{item.name}</Text>
              {item.seller ? (
                <View style={styles.sellerLine}>
                  <Icon name="storefront-outline" size={15} color={colors.muted} />
                  <Text style={type.meta}>Sold by {item.seller}</Text>
                </View>
              ) : null}
            </View>
            <IconButton
              icon={liked ? "heart" : "heart-outline"}
              color={liked ? colors.danger : colors.text}
              onPress={() => {
                const list = p.wish?.products || [];
                p.setWish({ ...p.wish, products: liked ? list.filter((id) => id !== item.id) : [...list, item.id] });
                p.notify(liked ? "Removed from wishlist" : "Saved to wishlist");
              }}
              accessibilityLabel="Toggle wishlist"
            />
          </View>
          <View style={styles.pricePanel}>
            <View>
              <Text style={type.overline}>Price</Text>
              <Text style={styles.bigPrice}>
                {money(item.price)}
                <Text style={styles.unit}> / {item.unit}</Text>
              </Text>
            </View>
            <View style={styles.qtyBox}>
              <Pressable style={styles.qtyButton} onPress={() => setQty(Math.max(1, qty - 1))} accessibilityLabel="Decrease quantity">
                <Icon name="remove" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.qtyValue}>{qty}</Text>
              <Pressable style={styles.qtyButton} onPress={() => setQty(Math.min(MAX_QTY, qty + 1))} accessibilityLabel="Increase quantity">
                <Icon name="add" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>
          {inCart ? <Notice icon="bag-check-outline" tone="success" text={`${inCart} already in your cart.`} /> : null}
          <Card>
            <Text style={[type.section, { marginBottom: space.sm }]}>Description</Text>
            <Text style={type.body}>{item.description || "The seller hasn’t added a description yet."}</Text>
          </Card>
        </View>
      </ScrollView>
      <StickyFooter>
        <Button variant="secondary" icon="bag-add-outline" onPress={add} style={{ flex: 1 }}>
          Add to cart
        </Button>
        <Button
          onPress={() => {
            add();
            p.go("cart");
          }}
          style={{ flex: 1 }}
        >
          Buy now
        </Button>
      </StickyFooter>
    </>
  );
}

function groupBySeller(cart) {
  const groups = new Map();
  for (const line of cart) {
    const key = String(line.owner || line.seller || "seller");
    if (!groups.has(key)) groups.set(key, { key, seller: line.seller, lines: [] });
    groups.get(key).lines.push(line);
  }
  return [...groups.values()];
}

export function Cart(p) {
  const groups = groupBySeller(p.cart);
  const setQty = (id, qty) =>
    p.setCart(qty <= 0 ? p.cart.filter((line) => line.id !== id) : p.cart.map((line) => (line.id === id ? { ...line, qty } : line)));
  return (
    <>
      <Header title="My cart" subtitle={p.cart.length ? `${cartCount(p.cart)} item(s)` : undefined} onBack={p.back} />
      <Screen footer={!!p.cart.length}>
        {!p.cart.length ? (
          <EmptyState
            icon="bag-outline"
            title="Your cart is empty"
            text="Browse the marketplace and add fresh produce or farm supplies."
            actionLabel="Browse marketplace"
            onAction={() => p.go("shop")}
          />
        ) : null}
        {groups.length > 1 ? (
          <Notice
            icon="storefront-outline"
            title={`Items from ${groups.length} sellers`}
            text="Each seller ships separately, so we’ll place one order per seller at checkout."
          />
        ) : null}
        {groups.map((group) => (
          <View key={group.key} style={{ marginBottom: space.md }}>
            {group.seller ? (
              <View style={styles.sellerHead}>
                <Icon name="storefront-outline" size={16} color={colors.muted} />
                <Text style={styles.sellerHeadText}>{group.seller}</Text>
              </View>
            ) : null}
            {group.lines.map((line) => (
              <Card key={line.id} style={styles.cartLine}>
                <Thumb uri={line.image} style={styles.cartThumb} icon="basket-outline" />
                <View style={{ flex: 1 }}>
                  <View style={styles.between}>
                    <Text style={[type.cardTitle, { flex: 1 }]} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Pressable onPress={() => setQty(line.id, 0)} hitSlop={10} accessibilityLabel={`Remove ${line.name}`}>
                      <Icon name="trash-outline" size={19} color={colors.subtle} />
                    </Pressable>
                  </View>
                  <Text style={type.meta}>
                    {money(line.price)} / {line.unit}
                  </Text>
                  <View style={[styles.between, { marginTop: space.sm }]}>
                    <View style={styles.qtyBoxSmall}>
                      <Pressable style={styles.qtyButtonSmall} onPress={() => setQty(line.id, line.qty - 1)} accessibilityLabel="Decrease quantity">
                        <Icon name="remove" size={18} color={colors.text} />
                      </Pressable>
                      <Text style={styles.qtyValueSmall}>{line.qty}</Text>
                      <Pressable style={styles.qtyButtonSmall} onPress={() => setQty(line.id, Math.min(MAX_QTY, line.qty + 1))} accessibilityLabel="Increase quantity">
                        <Icon name="add" size={18} color={colors.text} />
                      </Pressable>
                    </View>
                    <Text style={styles.price}>{money(line.price * line.qty)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ))}
        {p.cart.length ? (
          <Card>
            <KeyValue label="Items" value={String(cartCount(p.cart))} />
            <KeyValue label="Total" value={money(cartTotal(p.cart))} strong last />
            <Text style={[type.meta, { marginTop: space.xs }]}>Delivery charges, if any, are confirmed by the seller.</Text>
          </Card>
        ) : null}
      </Screen>
      {p.cart.length ? (
        <StickyFooter>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={type.meta}>Total</Text>
            <Text style={styles.footerTotal}>{money(cartTotal(p.cart))}</Text>
          </View>
          <Button onPress={() => p.go("checkout")} iconRight="arrow-forward" style={{ flex: 1.4 }}>
            Checkout
          </Button>
        </StickyFooter>
      ) : null}
    </>
  );
}

export function Checkout(p) {
  const addresses = useResource(p.token, async () => (await apiRequest("/addresses", { token: p.token })).addresses || []);
  const saved = addresses.data || [];
  const [selected, setSelected] = useState(null),
    [custom, setCustom] = useState(p.user?.location?.address || ""),
    [paymentMethod, setPaymentMethod] = useState("cod"),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const defaultId = (saved.find((item) => item.isDefault) || saved[0])?._id;
  const chosenId = selected ?? defaultId ?? "custom";
  const address = chosenId === "custom" ? custom.trim() : saved.find((item) => item._id === chosenId)?.address || "";
  const groups = groupBySeller(p.cart);
  const place = async () => {
    if (address.length < 5) return setError("Choose or enter a full delivery address.");
    setSaving(true);
    setError("");
    const placed = [];
    let remaining = [...p.cart];
    try {
      for (const group of groups) {
        const result = await apiRequest("/orders", {
          method: "POST",
          token: p.token,
          body: {
            items: group.lines.map((line) => ({ productId: line.id, quantity: line.qty })),
            deliveryAddress: address,
            paymentMethod,
          },
        });
        placed.push(result.order);
        const ids = group.lines.map((line) => line.id);
        remaining = remaining.filter((line) => !ids.includes(line.id));
      }
      p.setCart([]);
      if (placed.length === 1) {
        p.notify("Order placed");
        p.replace("orderDetail", placed[0]);
      } else {
        p.notify(`${placed.length} orders placed`);
        p.replace("orders");
      }
    } catch (e) {
      p.setCart(remaining);
      setError(placed.length ? `${placed.length} order(s) placed. The rest failed: ${e.message}` : e.message);
    } finally {
      setSaving(false);
    }
  };
  if (!p.cart.length)
    return (
      <>
        <Header title="Checkout" onBack={p.back} />
        <Screen>
          <EmptyState icon="bag-outline" title="Nothing to check out" text="Your cart is empty." actionLabel="Browse marketplace" onAction={() => p.go("shop")} />
        </Screen>
      </>
    );
  return (
    <>
      <Header title="Checkout" onBack={p.back} />
      <Screen footer>
        <SectionHeader title="Delivery address" actionLabel="Manage" onAction={() => p.go("addresses")} />
        {addresses.loading && !addresses.data ? <DataState resource={addresses} loadingLabel="Loading saved addresses…" /> : null}
        {saved.map((item) => {
          const active = chosenId === item._id;
          return (
            <Pressable
              key={item._id}
              onPress={() => setSelected(item._id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.option, active && styles.optionActive]}
            >
              <Icon name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? colors.primary : colors.subtle} />
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle}>{item.label || "Address"}</Text>
                <Text style={type.meta}>{item.address}</Text>
              </View>
              {item.isDefault ? <Badge label="Default" tone="primary" /> : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setSelected("custom")}
          accessibilityRole="radio"
          accessibilityState={{ checked: chosenId === "custom" }}
          style={[styles.option, chosenId === "custom" && styles.optionActive]}
        >
          <Icon
            name={chosenId === "custom" ? "radio-button-on" : "radio-button-off"}
            size={22}
            color={chosenId === "custom" ? colors.primary : colors.subtle}
          />
          <Text style={[type.cardTitle, { flex: 1 }]}>{saved.length ? "Deliver somewhere else" : "Enter delivery address"}</Text>
        </Pressable>
        {chosenId === "custom" ? (
          <Field value={custom} onChangeText={setCustom} placeholder="House, street, village, PIN code" multiline />
        ) : null}
        <SectionHeader title="Payment" style={{ marginTop: space.lg }} />
        <Segmented
          options={[
            ["cod", "Cash on delivery", "cash-outline"],
            ["upi", "UPI on delivery", "phone-portrait-outline"],
          ]}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
        <SectionHeader title="Order summary" />
        <Card>
          {p.cart.map((line) => (
            <KeyValue key={line.id} label={`${line.name} × ${line.qty}`} value={money(line.price * line.qty)} />
          ))}
          <KeyValue label="Total" value={money(cartTotal(p.cart))} strong last />
        </Card>
        {groups.length > 1 ? (
          <Notice icon="information-circle-outline" text={`This will place ${groups.length} separate orders, one per seller.`} />
        ) : null}
        <InlineError message={error} />
      </Screen>
      <StickyFooter>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={type.meta}>To pay</Text>
          <Text style={styles.footerTotal}>{money(cartTotal(p.cart))}</Text>
        </View>
        <Button loading={saving} onPress={place} style={{ flex: 1.4 }}>
          {saving ? "Placing…" : "Place order"}
        </Button>
      </StickyFooter>
    </>
  );
}

const ORDER_FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

const sellerIdOf = (order) => (typeof order.seller === "object" ? order.seller?._id : order.seller);

export function Orders(p) {
  const [filter, setFilter] = useState("all");
  const res = useResource(p.token, async () => (await apiRequest("/orders", { token: p.token })).orders || []);
  const isShop = p.user?.role === "shopkeeper";
  const list = (res.data || []).filter((order) =>
    filter === "all"
      ? true
      : filter === "active"
        ? !["delivered", "cancelled"].includes(order.status)
        : order.status === filter,
  );
  return (
    <>
      <Header
        title={isShop ? "Orders" : "My orders"}
        subtitle={isShop ? "Orders from your customers" : undefined}
        onBack={p.isTab ? undefined : p.back}
      />
      <Screen tab={p.isTab} onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {ORDER_FILTERS.map(([key, label]) => (
            <Chip key={key} label={label} active={filter === key} onPress={() => setFilter(key)} />
          ))}
        </ScrollView>
        <DataState
          resource={res}
          loadingLabel="Loading orders…"
          empty={!!res.data && !list.length}
          emptyProps={
            filter !== "all"
              ? { icon: "funnel-outline", title: "Nothing here", text: "No orders match this filter." }
              : isShop
                ? { icon: "cube-outline", title: "No orders yet", text: "Orders from farmers will appear here as soon as they’re placed." }
                : {
                    icon: "cube-outline",
                    title: "No orders yet",
                    text: "Your marketplace orders will appear here.",
                    actionLabel: "Browse marketplace",
                    onAction: () => p.go("shop"),
                  }
          }
        />
        {list.map((order) => {
          const incoming = String(sellerIdOf(order)) === String(p.user?.id);
          const party = incoming ? order.buyer?.fullName : order.seller?.fullName;
          return (
            <Card key={order._id} onPress={() => p.go("orderDetail", order)} style={styles.orderCard}>
              <Thumb uri={order.items?.[0]?.image} style={styles.orderThumb} icon="cube-outline" />
              <View style={{ flex: 1 }}>
                <View style={styles.between}>
                  <Text style={type.cardTitle}>Order #{shortId(order._id)}</Text>
                  <Text style={styles.price}>{money(order.amount)}</Text>
                </View>
                <Text style={type.meta} numberOfLines={1}>
                  {order.items?.length || 0} item(s) · {formatDate(order.createdAt)}
                  {party ? ` · ${incoming ? "from" : "by"} ${party}` : ""}
                </Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={order.status} />
                  {order.paymentStatus === "received" ? (
                    <Badge label="Paid" tone="success" icon="checkmark-circle" />
                  ) : order.status === "delivered" ? (
                    <Badge label={incoming ? "Verify payment" : "Payment due"} tone="warning" icon="hourglass-outline" />
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })}
      </Screen>
    </>
  );
}

const ORDER_STEPS = [
  ["placed", "Order placed", "receipt-outline"],
  ["confirmed", "Confirmed", "checkmark-circle-outline"],
  ["packed", "Packed", "cube-outline"],
  ["out_for_delivery", "Out for delivery", "bicycle-outline"],
  ["delivered", "Delivered", "home-outline"],
];

const NEXT_LABEL = {
  confirmed: "Confirm order",
  packed: "Mark as packed",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark as delivered",
};

export function StepTimeline({ steps, current }) {
  const index = Math.max(0, steps.findIndex(([key]) => key === current));
  return (
    <View>
      {steps.map(([key, label, icon], i) => {
        const done = i < index;
        const active = i === index;
        const last = i === steps.length - 1;
        return (
          <View key={key} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, (done || active) && styles.tlDotOn]}>
                <Icon name={done ? "checkmark" : icon} size={15} color={done || active ? colors.white : colors.subtle} />
              </View>
              {!last ? <View style={[styles.tlLine, done && styles.tlLineOn]} /> : null}
            </View>
            <View style={styles.tlText}>
              <Text style={[styles.tlLabel, (done || active) && styles.tlLabelOn]}>{label}</Text>
              {active ? <Text style={type.meta}>Current status</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const PAYABLE = ["out_for_delivery", "delivered"];
const UPI_REFERENCE = /^[A-Za-z0-9]{6,40}$/;
const modeLabel = (mode) => (mode === "upi" ? "UPI" : "Cash");

// The seller confirms money was actually received. Same rules as the server: UPI needs its
// transaction reference; cash may carry an optional receipt number.
function VerifyPaymentSheet({ visible, order, token, onClose, onVerified }) {
  const [method, setMethod] = useState(order.paymentMethod || "cod"),
    [reference, setReference] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const clean = reference.trim().replace(/\s+/g, "");
  const submit = async () => {
    if (method === "upi" && !UPI_REFERENCE.test(clean)) return setError("Enter the UPI transaction reference from your UPI app (6–40 letters or numbers).");
    if (method === "cod" && clean && !UPI_REFERENCE.test(clean)) return setError("Receipt number can only contain letters and numbers.");
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest(`/orders/${order._id}/payment`, { method: "PATCH", token, body: { method, reference: clean } });
      onVerified(result.order);
    } catch (e) {
      setError(e.message || "Couldn’t verify this payment.");
      setSaving(false);
    }
  };
  return (
    <Sheet
      visible={visible}
      title="Verify payment"
      subtitle={`Order #${shortId(order._id)} · buyer chose ${modeLabel(order.paymentMethod)} on delivery`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onPress={onClose} disabled={saving} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="success" icon="checkmark-circle-outline" loading={saving} onPress={submit} style={{ flex: 1.8 }}>
            Payment received
          </Button>
        </>
      }
    >
      <View style={styles.verifyAmount}>
        <Text style={type.overline}>Amount to receive</Text>
        <Text style={styles.verifyValue}>{money(order.amount)}</Text>
      </View>
      <Text style={styles.fieldLabel}>How was it paid?</Text>
      <Segmented
        options={[
          ["cod", "Cash", "cash-outline"],
          ["upi", "UPI", "phone-portrait-outline"],
        ]}
        value={method}
        onChange={(next) => {
          setMethod(next);
          setError("");
        }}
      />
      <Field
        label={method === "upi" ? "UPI transaction reference" : "Receipt number (optional)"}
        icon={method === "upi" ? "receipt-outline" : "document-text-outline"}
        value={reference}
        onChangeText={setReference}
        placeholder={method === "upi" ? "e.g. 412345678901" : "If you gave a receipt"}
        autoCapitalize="characters"
        maxLength={40}
        hint={method === "upi" ? "Find it as UTR / reference number in the payment details of your UPI app." : undefined}
      />
      <Notice
        icon="shield-checkmark-outline"
        tone="warning"
        text="Confirm only after the cash is in your hand or your UPI app shows the money as received. This can’t be undone."
        style={{ marginBottom: 0 }}
      />
      <InlineError message={error} />
    </Sheet>
  );
}

export function OrderDetail(p) {
  const [current, setCurrent] = useState(p.order || {}),
    [busy, setBusy] = useState(""),
    [verifying, setVerifying] = useState(false);
  const isSeller = String(sellerIdOf(current)) === String(p.user?.id);
  const cancelled = current.status === "cancelled";
  const index = ORDER_STEPS.findIndex(([key]) => key === current.status);
  const next = isSeller && !cancelled && index >= 0 ? ORDER_STEPS[index + 1]?.[0] : null;
  const canCancel = isSeller && ["placed", "confirmed"].includes(current.status);
  const paid = current.paymentStatus === "received";
  const canVerify = isSeller && !paid && PAYABLE.includes(current.status);
  const paymentState = paid
    ? { label: "Paid", tone: "success", icon: "checkmark-circle" }
    : cancelled
      ? { label: "Not required", tone: "neutral", icon: "remove-circle-outline" }
      : PAYABLE.includes(current.status)
        ? { label: "Awaiting payment", tone: "warning", icon: "hourglass-outline" }
        : { label: "Due on delivery", tone: "neutral", icon: "time-outline" };
  const hasFooter = !!(next || canCancel || canVerify);
  const update = async (status) => {
    setBusy(status);
    try {
      const result = await apiRequest(`/orders/${current._id}/status`, { method: "PATCH", token: p.token, body: { status } });
      setCurrent((old) => ({ ...result.order, buyer: old.buyer, seller: old.seller }));
      p.notify(`Order ${statusInfo(status).label.toLowerCase()}`);
    } catch (e) {
      p.notify(e.message);
    } finally {
      setBusy("");
    }
  };
  const counterpart = isSeller ? current.buyer : current.seller;
  return (
    <>
      <Header title={`Order #${shortId(current._id)}`} subtitle={formatDate(current.createdAt)} onBack={p.back} />
      <Screen footer={hasFooter}>
        <Card>
          <View style={[styles.between, { marginBottom: space.lg }]}>
            <Text style={type.section}>Status</Text>
            <StatusBadge status={current.status} />
          </View>
          {cancelled ? (
            <Notice icon="close-circle-outline" tone="danger" title="Order cancelled" text="This order was cancelled and won’t be delivered." style={{ marginBottom: 0 }} />
          ) : (
            <StepTimeline steps={ORDER_STEPS} current={current.status} />
          )}
        </Card>
        <SectionHeader title="Items" style={{ marginTop: space.md }} />
        {(current.items || []).map((item, i) => (
          <Card key={`${item.product || item.name}-${i}`} style={styles.cartLine}>
            <Thumb uri={item.image} style={styles.cartThumb} icon="basket-outline" />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={type.meta}>
                {item.quantity} × {money(item.price)} / {item.unit}
              </Text>
            </View>
            <Text style={styles.price}>{money(item.price * item.quantity)}</Text>
          </Card>
        ))}
        <Card>
          <View style={[styles.between, { marginBottom: space.xs }]}>
            <Text style={type.section}>Payment</Text>
            <Badge label={paymentState.label} tone={paymentState.tone} icon={paymentState.icon} />
          </View>
          <KeyValue label="Buyer chose" value={`${modeLabel(current.paymentMethod)} on delivery`} />
          {paid ? (
            <>
              <KeyValue label="Received via" value={modeLabel(current.paidVia)} />
              {current.paymentReference ? <KeyValue label="Reference" value={current.paymentReference} /> : null}
              <KeyValue label="Received on" value={formatDate(current.paymentReceivedAt, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} />
            </>
          ) : null}
          <KeyValue label="Order total" value={money(current.amount)} strong last />
          {canVerify && current.status === "delivered" ? (
            <Notice icon="hourglass-outline" tone="warning" text="Delivered. Verify the payment once you have received it so it counts in your earnings." style={{ marginTop: space.md, marginBottom: 0 }} />
          ) : null}
        </Card>
        <Card>
          <Text style={[type.overline, { marginBottom: space.sm }]}>Delivery address</Text>
          <Text style={[type.body, { color: colors.text }]}>{current.deliveryAddress || "—"}</Text>
        </Card>
        {counterpart?.fullName ? (
          <Card style={styles.party}>
            <Avatar name={counterpart.fullName} uri={counterpart.avatarUrl} />
            <View style={{ flex: 1 }}>
              <Text style={type.overline}>{isSeller ? "Customer" : "Seller"}</Text>
              <Text style={type.cardTitle}>{counterpart.fullName}</Text>
              {counterpart.mobile ? <Text style={type.meta}>{counterpart.mobile}</Text> : null}
            </View>
          </Card>
        ) : null}
      </Screen>
      {hasFooter ? (
        <StickyFooter>
          {canVerify ? (
            <Button
              variant={next ? "secondary" : "success"}
              icon="wallet-outline"
              disabled={!!busy}
              onPress={() => setVerifying(true)}
              style={{ flex: next ? 1.2 : 1 }}
            >
              Verify payment
            </Button>
          ) : null}
          {canCancel ? (
            <Button variant="dangerSoft" loading={busy === "cancelled"} disabled={!!busy} onPress={() => update("cancelled")} style={{ flex: 1 }}>
              Cancel
            </Button>
          ) : null}
          {next ? (
            <Button loading={busy === next} disabled={!!busy} onPress={() => update(next)} style={{ flex: 1.6 }}>
              {NEXT_LABEL[next]}
            </Button>
          ) : null}
        </StickyFooter>
      ) : null}
      {canVerify ? (
        <VerifyPaymentSheet
          visible={verifying}
          order={current}
          token={p.token}
          onClose={() => setVerifying(false)}
          onVerified={(order) => {
            setCurrent((old) => ({ ...order, buyer: order.buyer || old.buyer, seller: order.seller || old.seller }));
            setVerifying(false);
            p.notify("Payment verified");
          }}
        />
      ) : null}
    </>
  );
}

export function Wishlist(p) {
  const [tab, setTab] = useState("products");
  const res = useResource(p.token, async () => {
    const [productData, tractorData] = await Promise.all([
      apiRequest("/products", { token: p.token }),
      apiRequest("/tractors", { token: p.token }),
    ]);
    return { products: (productData.products || []).map(toMarketplaceProduct), tractors: tractorData.tractors || [] };
  });
  const products = (res.data?.products || []).filter((item) => p.wish?.products?.includes(item.id));
  const tractors = (res.data?.tractors || []).filter((item) => p.wish?.tractors?.includes(item._id));
  const empty = tab === "products" ? !products.length : !tractors.length;
  return (
    <>
      <Header title="Wishlist" onBack={p.back} />
      <Screen onRefresh={res.reload} refreshing={res.loading && !!res.data}>
        <Segmented
          options={[
            ["products", `Products (${products.length})`, "basket-outline"],
            ["tractors", `Tractors (${tractors.length})`, "construct-outline"],
          ]}
          value={tab}
          onChange={setTab}
        />
        <DataState
          resource={res}
          loadingLabel="Loading your wishlist…"
          empty={!!res.data && empty}
          emptyProps={{
            icon: "heart-outline",
            title: tab === "products" ? "No saved products" : "No saved tractors",
            text: "Tap the heart on any listing to save it here.",
            actionLabel: tab === "products" ? "Browse marketplace" : "Browse tractors",
            onAction: () => p.go(tab === "products" ? "shop" : "tractors"),
          }}
        />
        {tab === "products" ? (
          <View style={styles.grid}>
            {products.map((item) => (
              <ProductCard key={item.id} product={item} {...p} />
            ))}
          </View>
        ) : (
          tractors.map((item) => <TractorCard key={item._id} tractor={item} onPress={() => p.go("tractor", item)} {...p} />)
        )}
      </Screen>
    </>
  );
}

export function GlobalSearch(p) {
  const [q, setQ] = useState(""),
    [result, setResult] = useState({ products: [], tractors: [], locationRequired: false }),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return undefined;
    let active = true;
    const handle = setTimeout(() => {
      setLoading(true);
      apiRequest(`/search?q=${encodeURIComponent(term)}`, { token: p.token })
        .then((data) => {
          if (active) {
            setResult({ products: data.products || [], tractors: data.tractors || [], locationRequired: !!data.locationRequired });
            setError("");
          }
        })
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [term, p.token]);
  const show = term.length >= 2;
  const products = show ? result.products : [];
  const tractors = show ? result.tractors : [];
  return (
    <>
      <Header title="Search" onBack={p.back} />
      <Screen>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search tractors and products" autoFocus />
        {!show ? (
          <EmptyState compact icon="search-outline" title="Find anything" text="Type at least 2 letters to search tractors and marketplace products." />
        ) : null}
        {show && loading ? <Text style={[type.meta, { marginBottom: space.md }]}>Searching…</Text> : null}
        <InlineError message={show ? error : ""} />
        {show && result.locationRequired ? (
          <Notice
            icon="location-outline"
            tone="warning"
            text="Tractors are hidden until your location is set. Set it in Profile to see tractors that can reach you."
          />
        ) : null}
        {tractors.length ? <SectionHeader title={`Tractors (${tractors.length})`} style={{ marginTop: space.sm }} /> : null}
        {tractors.map((item) => (
          <Card key={item._id} onPress={() => p.go("tractor", item)} style={styles.resultRow}>
            <Thumb uri={item.images?.[0]} style={styles.resultThumb} icon="construct-outline" />
            <View style={{ flex: 1 }}>
              <Text style={type.cardTitle} numberOfLines={1}>
                {item.brand}
              </Text>
              <Text style={type.meta}>{money(item.pricePerAcre)} / acre</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.subtle} />
          </Card>
        ))}
        {products.length ? <SectionHeader title={`Products (${products.length})`} style={{ marginTop: space.md }} /> : null}
        {products.map((raw) => {
          const item = toMarketplaceProduct(raw);
          return (
            <Card key={item.id} onPress={() => p.go("product", item)} style={styles.resultRow}>
              <Thumb uri={item.image} style={styles.resultThumb} icon="basket-outline" />
              <View style={{ flex: 1 }}>
                <Text style={type.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={type.meta}>
                  {money(item.price)} / {item.unit}
                  {item.seller ? ` · ${item.seller}` : ""}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.subtle} />
            </Card>
          );
        })}
        {show && !loading && !error && !products.length && !tractors.length ? (
          <EmptyState compact icon="search-outline" title="No results" text={`Nothing matches “${term}”. Try a different word.`} />
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
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
    marginBottom: space.md,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.text, minHeight: 48 },
  chips: { marginBottom: space.lg, marginHorizontal: -space.lg, paddingHorizontal: space.lg, flexGrow: 0 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md },
  detailBody: { padding: space.lg },
  sellerLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.xs },
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
  unit: { fontSize: 13, fontWeight: "600", color: colors.muted },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  qtyValue: { minWidth: 32, textAlign: "center", fontSize: 17, fontWeight: "800", color: colors.text },
  qtyBoxSmall: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  qtyButtonSmall: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  qtyValueSmall: { minWidth: 26, textAlign: "center", fontSize: 15, fontWeight: "800", color: colors.text },
  sellerHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space.sm },
  sellerHeadText: { fontSize: 13, fontWeight: "800", color: colors.textSecondary },
  cartLine: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  cartThumb: { width: 80, height: 80 },
  footerTotal: { fontSize: 20, fontWeight: "800", color: colors.text },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: space.md,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  orderCard: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  orderThumb: { width: 64, height: 64 },
  tlRow: { flexDirection: "row", gap: space.md },
  tlRail: { alignItems: "center", width: 32 },
  tlDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tlDotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tlLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  tlLineOn: { backgroundColor: colors.primary },
  tlText: { flex: 1, paddingTop: 5, paddingBottom: space.lg },
  tlLabel: { fontSize: 14, fontWeight: "600", color: colors.muted },
  tlLabelOn: { color: colors.text, fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  verifyAmount: { alignItems: "center", backgroundColor: colors.successSoft, borderRadius: 14, paddingVertical: space.lg, marginBottom: space.lg },
  verifyValue: { fontSize: 30, fontWeight: "800", color: colors.text, marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: space.sm },
  party: { flexDirection: "row", alignItems: "center", gap: space.md },
  resultRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  resultThumb: { width: 56, height: 56 },
});


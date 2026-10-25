import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, money, radius, shadow, space, type } from "../lib/theme";
import { Card, Icon, StatusBadge } from "./ui";
import { Thumb } from "./media";
import { formatKm } from "../lib/location";

// Normalises an API product into the shape the marketplace UI and cart use.
// No invented ratings, stock, categories or stock photos: only what the API returns.
export function toMarketplaceProduct(item) {
  return {
    id: item._id || item.id,
    name: item.name,
    description: item.description,
    seller: item.sellerName || item.seller || "",
    price: Number(item.price) || 0,
    unit: item.unit || "kg",
    image: item.images?.[0] || item.image || null,
    images: item.images || (item.image ? [item.image] : []),
    owner: typeof item.owner === "object" ? item.owner?._id : item.owner,
    status: item.status,
  };
}

// The server accepts whole quantities from 1 to 999 per product.
export const MAX_QTY = 999;

// Adds a product, increasing quantity instead of duplicating the line.
export function addToCart(cart, product, qty = 1) {
  const existing = cart.find((line) => line.id === product.id);
  if (existing) return cart.map((line) => (line.id === product.id ? { ...line, qty: Math.min(MAX_QTY, line.qty + qty) } : line));
  return [...cart, { ...toMarketplaceProduct(product), id: product.id, owner: product.owner, qty }];
}

export function ProductCard({ product, go, cart = [], setCart, wish, setWish, notify }) {
  const liked = wish?.products?.includes(product.id);
  const inCart = cart.find((line) => line.id === product.id)?.qty || 0;
  const toggleWish = () => {
    const list = wish?.products || [];
    setWish({ ...wish, products: liked ? list.filter((id) => id !== product.id) : [...list, product.id] });
    notify?.(liked ? "Removed from wishlist" : "Saved to wishlist");
  };
  const add = () => {
    setCart(addToCart(cart, product));
    notify?.(`${product.name} added to cart`);
  };
  return (
    <Card onPress={() => go("product", product)} style={styles.product} accessibilityLabel={product.name}>
      <View>
        <Thumb uri={product.image} style={styles.productImage} icon="basket-outline" />
        {setWish ? (
          <Pressable style={styles.heart} onPress={toggleWish} hitSlop={8} accessibilityLabel={liked ? "Remove from wishlist" : "Save to wishlist"}>
            <Icon name={liked ? "heart" : "heart-outline"} size={17} color={liked ? colors.danger : colors.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.seller ? (
          <Text style={type.meta} numberOfLines={1}>
            {product.seller}
          </Text>
        ) : null}
        <View style={styles.productFoot}>
          <Text style={styles.price} numberOfLines={1}>
            {money(product.price)}
            <Text style={styles.unit}>/{product.unit}</Text>
          </Text>
          {setCart ? (
            <Pressable
              onPress={add}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Add ${product.name} to cart`}
              style={({ pressed }) => [styles.addButton, inCart && styles.addButtonActive, pressed && { opacity: 0.85 }]}
            >
              {inCart ? <Text style={styles.addCount}>{inCart}</Text> : <Icon name="add" size={20} color={colors.white} />}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function TractorCard({ tractor, onPress, wish, setWish, notify, horizontal = false }) {
  const liked = wish?.tractors?.includes(tractor._id);
  const toggle = () => {
    const list = wish?.tractors || [];
    setWish({ ...wish, tractors: liked ? list.filter((id) => id !== tractor._id) : [...list, tractor._id] });
    notify?.(liked ? "Removed from wishlist" : "Saved to wishlist");
  };
  const available = tractor.availability === "available";
  return (
    <Card onPress={onPress} style={[styles.tractor, horizontal && styles.tractorHorizontal]} accessibilityLabel={tractor.brand}>
      <View>
        <Thumb uri={tractor.images?.[0]} style={[styles.tractorImage, horizontal && { height: 140 }]} icon="construct-outline" />
        {setWish ? (
          <Pressable style={styles.heart} onPress={toggle} hitSlop={8} accessibilityLabel={liked ? "Remove from wishlist" : "Save to wishlist"}>
            <Icon name={liked ? "heart" : "heart-outline"} size={18} color={liked ? colors.danger : colors.text} />
          </Pressable>
        ) : null}
        {!horizontal ? (
          <View style={styles.imageBadge}>
            <StatusBadge status={available ? "available" : "unavailable"} />
          </View>
        ) : null}
      </View>
      <View style={styles.tractorBody}>
        <Text style={type.cardTitle} numberOfLines={1}>
          {tractor.brand}
        </Text>
        {!horizontal && tractor.description ? (
          <Text style={[type.meta, { marginTop: 2 }]} numberOfLines={2}>
            {tractor.description}
          </Text>
        ) : null}
        <View style={styles.tractorMeta}>
          <Text style={styles.price}>
            {money(tractor.pricePerAcre)}
            <Text style={styles.unit}> / acre</Text>
          </Text>
          {Number.isFinite(tractor.distanceKm) ? (
            <View style={[styles.metaPill, styles.nearPill]}>
              <Icon name="location" size={13} color={colors.success} />
              <Text style={[styles.metaPillText, { color: colors.success }]}>{formatKm(tractor.distanceKm)} away</Text>
            </View>
          ) : (
            <View style={styles.metaPill}>
              <Icon name="navigate-outline" size={13} color={colors.muted} />
              <Text style={styles.metaPillText}>serves {tractor.maxDistance} km</Text>
            </View>
          )}
        </View>
        {!horizontal && tractor.owner?.fullName ? (
          <View style={styles.vendorLine}>
            <Icon name="business-outline" size={14} color={colors.subtle} />
            <Text style={type.meta} numberOfLines={1}>
              {tractor.owner.fullName}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  product: { width: "48.3%", padding: 0, overflow: "hidden", marginBottom: 0 },
  productImage: { width: "100%", height: 132, borderRadius: 0 },
  productBody: { padding: space.md, flex: 1 },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text, lineHeight: 19, minHeight: 38 },
  productFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, marginTop: space.sm },
  price: { fontSize: 16, fontWeight: "800", color: colors.text, flexShrink: 1 },
  unit: { fontSize: 12, fontWeight: "600", color: colors.muted },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonActive: { backgroundColor: colors.success },
  addCount: { color: colors.white, fontSize: 14, fontWeight: "800" },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  tractor: { padding: 0, overflow: "hidden" },
  tractorHorizontal: { width: 248, marginRight: space.md, marginBottom: space.xs },
  tractorImage: { width: "100%", height: 172, borderRadius: 0 },
  imageBadge: { position: "absolute", top: 12, left: 12 },
  tractorBody: { padding: space.lg },
  tractorMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.md },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nearPill: { backgroundColor: colors.successSoft },
  metaPillText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  vendorLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});

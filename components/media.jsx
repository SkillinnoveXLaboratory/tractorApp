import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { colors, radius, space, type } from "../lib/theme";
import { Icon } from "./ui";

export const MAX_PHOTOS = 6;

// Shows a real image, or a neutral icon tile when the listing has no photo.
export function Thumb({ uri, source, style, icon = "image-outline", iconSize = 26 }) {
  const [failed, setFailed] = useState(false);
  if ((uri || source) && !failed)
    return (
      <Image
        source={source || { uri }}
        style={[styles.thumbBase, style]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  return (
    <View style={[styles.thumbBase, styles.placeholder, style]}>
      <Icon name={icon} size={iconSize} color={colors.subtle} />
    </View>
  );
}

// Full-width swipeable gallery with a page indicator.
export function Gallery({ images = [], height = 280, icon = "image-outline" }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  if (!images.length) return <Thumb style={{ width, height, borderRadius: 0 }} icon={icon} iconSize={44} />;
  return (
    <View style={{ height, backgroundColor: colors.ink }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        {images.map((url, index) => (
          <Thumb key={`${url}-${index}`} uri={url} style={{ width, height, borderRadius: 0 }} icon={icon} />
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View style={styles.dots}>
          {images.map((url, index) => (
            <View key={`${url}-dot-${index}`} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
      <View style={styles.count}>
        <Icon name="images-outline" size={13} color={colors.white} />
        <Text style={styles.countText}>
          {Math.min(page + 1, images.length)}/{images.length}
        </Text>
      </View>
    </View>
  );
}

// Lets the user keep existing remote photos, remove them, and add new local ones (max 6 total).
export function PhotoPicker({
  label = "Photos",
  existing = [],
  onRemoveExisting,
  photos,
  onChange,
  onError,
  hint = `Up to ${MAX_PHOTOS} JPG, PNG or WEBP photos, 5 MB each.`,
  addIcon = "camera-outline",
}) {
  const total = existing.length + photos.length;
  const choose = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return onError?.("Allow photo access to add images.");
    const available = Math.max(0, MAX_PHOTOS - total);
    if (!available) return onError?.(`You can add up to ${MAX_PHOTOS} photos.`);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: available,
      quality: 0.85,
    });
    if (!result.canceled) {
      onError?.("");
      onChange([...photos, ...result.assets].slice(0, MAX_PHOTOS - existing.length));
    }
  };
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={styles.pickerHead}>
        <Text style={styles.label}>{label}</Text>
        <Text style={type.meta}>
          {total}/{MAX_PHOTOS}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {existing.map((url) => (
          <View key={url} style={styles.tile}>
            <Thumb uri={url} style={styles.tileImage} />
            {onRemoveExisting ? (
              <Pressable
                style={styles.remove}
                onPress={() => onRemoveExisting(url)}
                hitSlop={8}
                accessibilityLabel="Remove photo"
              >
                <Icon name="close" size={14} color={colors.white} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {photos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`} style={styles.tile}>
            <Thumb uri={photo.uri} style={styles.tileImage} />
            <Pressable
              style={styles.remove}
              onPress={() => onChange(photos.filter((_, i) => i !== index))}
              hitSlop={8}
              accessibilityLabel="Remove photo"
            >
              <Icon name="close" size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {total < MAX_PHOTOS ? (
          <Pressable style={styles.add} onPress={choose} accessibilityRole="button" accessibilityLabel="Add photos">
            <Icon name={addIcon} size={24} color={colors.primary} />
            <Text style={styles.addText}>{total ? "Add more" : "Add photos"}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// Appends picked photos to multipart form data the way the API expects ("images" field).
export function appendPhotos(form, photos, prefix) {
  photos.forEach((photo, index) =>
    form.append("images", new File(photo.uri), photo.fileName || `${prefix}-${Date.now()}-${index}.jpg`),
  );
}

const styles = StyleSheet.create({
  thumbBase: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, overflow: "hidden" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 20, backgroundColor: colors.white },
  count: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15,23,42,0.65)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  pickerHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  label: { fontSize: 13, fontWeight: "700", color: colors.text },
  tile: { width: 92, height: 92 },
  tileImage: { width: 92, height: 92, borderRadius: radius.md },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  hint: { fontSize: 12, color: colors.muted, marginTop: space.sm, lineHeight: 17 },
});

import * as Location from "expo-location";

// Same formula the server uses, so previews in the app match what the server enforces.
export function distanceKm(a, b) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))) * 10) / 10;
}

export const hasPoint = (place) => Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude);

// Where a tractor is based: its own pin, or its vendor's location for older listings.
export const tractorPlace = (tractor) =>
  hasPoint(tractor?.location) ? tractor.location : hasPoint(tractor?.owner?.location) ? tractor.owner.location : null;

export const formatKm = (km) => (Number.isFinite(km) ? `${km < 10 ? km.toFixed(1) : Math.round(km)} km` : "");

function labelFor(place, latitude, longitude) {
  if (!place) return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  const parts = [place.name && place.name !== place.street ? place.name : null, place.district || place.subregion, place.city, place.region]
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index);
  return parts.slice(0, 3).join(", ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

async function describe(latitude, longitude) {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return labelFor(place, latitude, longitude);
  } catch {
    return labelFor(null, latitude, longitude);
  }
}

export async function locationPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.granted;
}

// GPS position with a readable address. Throws a user-facing message on failure.
export async function currentPlace() {
  if (!(await locationPermission())) throw new Error("Location permission is off. Allow it in your phone settings or search for a place instead.");
  const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
  if (!enabled) throw new Error("Turn on your phone's location (GPS) and try again.");
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;
  return { latitude, longitude, address: await describe(latitude, longitude), source: "gps" };
}

// Looks a place up by name using the phone's built-in geocoder (no API key required).
export async function searchPlaces(query) {
  const term = String(query || "").trim();
  if (term.length < 3) return [];
  const results = await Location.geocodeAsync(term);
  const unique = results.filter(
    (item, index, all) =>
      all.findIndex((other) => Math.abs(other.latitude - item.latitude) < 0.001 && Math.abs(other.longitude - item.longitude) < 0.001) === index,
  );
  return Promise.all(
    unique.slice(0, 5).map(async ({ latitude, longitude }) => ({ latitude, longitude, address: await describe(latitude, longitude) })),
  );
}

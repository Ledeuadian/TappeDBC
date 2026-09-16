/**
 * Reverse-geocode a lat/lng into a human-readable address string using the
 * OpenStreetMap Nominatim service. Free, no API key, but rate-limited to
 * ~1 req/sec. We respect that by NOT firing unless the caller asks.
 *
 * Returns `{ address, source: 'nominatim' }` on success,
 * `{ address: null, source: 'coords' }` on failure (the caller can still
 * surface the raw lat/lng instead).
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    })
    if (!res.ok) return { address: null, source: 'coords' }
    const data = await res.json()
    return { address: data.display_name || null, source: 'nominatim' }
  } catch {
    return { address: null, source: 'coords' }
  }
}

/** Best-effort single-shot geolocation. Resolves to `{ lat, lng }` or
 *  `null` if denied / unavailable / timed out. */
export function getCurrentPosition(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

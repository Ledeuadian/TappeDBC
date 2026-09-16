/**
 * Build a structured address from a Nominatim `address` object, using the
 * most specific field available. Falls back through the OSM hierarchy:
 *   barangay → neighbourhood / suburb / village / hamlet / quarter
 *   city     → city / town / municipality
 *   province → state / province / region
 *   postcode → postcode
 *   country  → country
 */
/**
 * Build a structured address from a Nominatim `address` object. Tuned for
 * the Philippines field map, where OSM rarely populates `barangay` /
 * `state` / `province` directly and instead uses `neighbourhood` for the
 * barangay/purok and `region` for the province.
 *
 *   barangay → neighbourhood > quarter > suburb > village > hamlet >
 *              city_district > barangay
 *   city     → city > town > municipality > county
 *   province → region > state > province
 *   postcode → postcode
 *   country  → country
 */
function buildStructuredAddress(addr = {}) {
  const barangay =
    addr.neighbourhood ||
    addr.quarter ||
    addr.suburb ||
    addr.village ||
    addr.hamlet ||
    addr.city_district ||
    addr.barangay ||
    ''
  const city =
    addr.city || addr.town || addr.municipality || addr.county || ''
  const province = addr.region || addr.state || addr.province || ''
  const postcode = addr.postcode || ''
  const country = addr.country || ''

  return [barangay, city, province, postcode, country]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Reverse-geocode a lat/lng into a structured address using the OpenStreetMap
 * Nominatim service. Free, no API key, but rate-limited to ~1 req/sec.
 *
 * Returns:
 *   - `{ barangay, city, province, postcode, country, formatted, source: 'nominatim' }`
 *     on success (any of the sub-fields may be empty if Nominatim didn't supply them).
 *   - `{ formatted: null, source: 'coords' }` on failure (caller can fall back to raw lat/lng).
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    })
    if (!res.ok) return { formatted: null, source: 'coords' }
    const data = await res.json()
    const a = data.address || {}
    // Same hierarchy as buildStructuredAddress — kept in sync for callers
    // that want the fields individually.
    const parts = {
      barangay:
        a.neighbourhood ||
        a.quarter ||
        a.suburb ||
        a.village ||
        a.hamlet ||
        a.city_district ||
        a.barangay ||
        '',
      city: a.city || a.town || a.municipality || a.county || '',
      province: a.region || a.state || a.province || '',
      postcode: a.postcode || '',
      country: a.country || '',
    }
    // Structured parts first; Nominatim's display_name as a backup for
    // sparse areas where the structured fields come back empty.
    const formatted = buildStructuredAddress(a) || data.display_name || null
    return { ...parts, formatted, source: 'nominatim' }
  } catch {
    return { formatted: null, source: 'coords' }
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

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
 * Reverse-geocode a lat/lng into a structured address.
 *
 * Primary: BigDataCloud's free client-side endpoint — explicitly built
 * for browser use (proper CORS, no key, no UA policy issues). This is
 * what makes it work on tablets/phones where Nominatim browser fetches
 * are commonly blocked.
 * Fallback: OpenStreetMap Nominatim.
 *
 * Returns `{ barangay, city, province, postcode, country, formatted,
 * source }` — `formatted` is null if both providers fail.
 */
export async function reverseGeocode(lat, lng) {
  // --- Primary: BigDataCloud (browser-friendly) ---
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    const res = await fetch(url)
    if (res.ok) {
      const d = await res.json()
      // BigDataCloud rarely tags a Philippine barangay directly. When it
      // does, it appears in the informative list with an explicit
      // "barangay"/"barrio" description — we don't match broader entries
      // like congressional districts (too coarse to be useful).
      const informative = d.localityInfo?.informative || []
      const barangayCandidate = informative.find((i) =>
        /barangay|barrio/i.test(i.name || i.description || ''),
      )
      const barangay = barangayCandidate?.name || d.locality || ''
      const city = d.city || ''
      const province = d.principalSubdivision || ''
      const postcode = d.postcode || ''
      const country = d.countryName || ''
      // Drop the barangay when it duplicates the city (BigDataCloud uses
      // `locality` as a fallback, which usually equals `city`).
      const cleanBarangay = barangay && barangay !== city ? barangay : ''
      const formatted = [cleanBarangay, city, province, postcode, country]
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .join(', ')
      if (formatted) {
        return {
          barangay: cleanBarangay,
          city,
          province,
          postcode,
          country,
          formatted,
          source: 'bigdatacloud',
        }
      }
    } else {
      console.warn('[tappe] bigdatacloud HTTP', res.status)
    }
  } catch (err) {
    console.warn('[tappe] bigdatacloud fetch failed', err)
  }

  // --- Fallback: Nominatim ---
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'Referer': window.location.origin,
      },
    })
    if (!res.ok) {
      console.warn('[tappe] nominatim HTTP', res.status, 'for', lat, lng)
      return { formatted: null, source: 'coords' }
    }
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
    console.log('[tappe] nominatim formatted', formatted)
    return { ...parts, formatted, source: 'nominatim' }
  } catch (err) {
    console.warn('[tappe] nominatim fetch failed', err)
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

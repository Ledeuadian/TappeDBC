/**
 * Reverse-geocode a lat/lng into a structured address.
 *
 * Calls the deployed Supabase Edge Function (server-side proxy) — this
 * is the ONLY provider we hit from the browser, because:
 *   • The site's CSP blocks direct calls to bigdatacloud.net and
 *     nominatim.openstreetmap.org.
 *   • Some PH mobile networks CORS-block those providers too.
 *   • Browser-side fetches to Nominatim violate their UA policy.
 *
 * The edge function itself runs Nominatim (with proper UA) and falls
 * back to BigDataCloud if needed.
 *
 * Returns `{ barangay, city, province, postcode, country, formatted,
 * source }` — `formatted` is null if the lookup fails.
 */
export async function reverseGeocode(lat, lng) {
  const fnUrl = import.meta.env.APP_SUPABASE_URL
  if (!fnUrl) {
    console.warn('[tappe] APP_SUPABASE_URL not set — geocoding disabled')
    return { formatted: null, source: 'coords' }
  }

  try {
    const url = `${fnUrl}/functions/v1/reverse-geocode?lat=${lat}&lon=${lng}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${import.meta.env.APP_SUPABASE_ANON_KEY}`,
      },
    })
    if (res.ok) {
      const d = await res.json()
      console.log('[tappe] geocode result', d)
      if (d.formatted) return d
      // The server already tried its own fallbacks — if it couldn't
      // resolve, no point retrying from the client.
      return { formatted: null, source: 'coords' }
    }
    console.warn('[tappe] geocode HTTP', res.status)
  } catch (err) {
    console.warn('[tappe] geocode fetch failed', err)
  }

  return { formatted: null, source: 'coords' }
}

/** Best-effort single-shot geolocation. Resolves to `{ lat, lng }` or
 *  `null` if denied / unavailable / timed out.
 *
 *  Dev override: set `localStorage.setItem('tappe_debug_coords', 'lat,lng')`
 *  in DevTools (F12 → Console) to bypass the device GPS — useful for
 *  testing the geocoder on a desktop that has no GPS. Clear the key
 *  (or call `localStorage.removeItem('tappe_debug_coords')`) to restore
 *  real geolocation. Example:
 *    localStorage.setItem('tappe_debug_coords', '8.4542,124.6319')
 */
export function getCurrentPosition(timeoutMs = 10000) {
  return new Promise((resolve) => {
    try {
      const override = window.localStorage?.getItem('tappe_debug_coords')
      if (override) {
        const [latStr, lngStr] = override.split(',').map((s) => s.trim())
        const lat = parseFloat(latStr)
        const lng = parseFloat(lngStr)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          console.log('[tappe] using debug coords from localStorage:', lat, lng)
          return resolve({ lat, lng })
        }
      }
    } catch {
      /* localStorage unavailable — fall through to real geolocation */
    }
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

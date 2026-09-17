// Supabase Edge Function: reverse-geocode
// Proxies lat/lng → place-name lookups server-side, avoiding browser-side
// CORS/network blocks that break client-side geocoding on some networks.
//
// Deploy: supabase functions deploy reverse-geocode --no-verify-jwt
// Usage:  GET /functions/v1/reverse-geocode?lat=8.4542&lon=124.6319

const FETCH_TIMEOUT_MS = 8000

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

function pickBarangay(a: Record<string, string>): string {
  return (
    a.neighbourhood || a.quarter || a.suburb || a.village || a.hamlet ||
    a.city_district || a.barangay || ''
  )
}

function pickCity(a: Record<string, string>): string {
  return a.city || a.town || a.municipality || a.county || ''
}

function pickProvince(a: Record<string, string>): string {
  return a.region || a.state || a.province || ''
}

Deno.serve(async (req: Request) => {
  // CORS preflight — the browser sends OPTIONS before the real GET when
  // the request includes an Authorization header from another origin.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return json({ error: 'method not allowed' }, 405)
  }

  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') || '')
  const lon = parseFloat(url.searchParams.get('lon') || '')
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: 'lat and lon query params required' }, 400)
  }

  // --- Primary: Nominatim (server-side, proper User-Agent) ---
  try {
    const u =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}` +
      `&addressdetails=1&zoom=18`
    const res = await fetchWithTimeout(u, {
      headers: {
        'User-Agent': 'TappeDBC/1.0 (https://tappedigitalbusinesscard.vercel.app)',
        'Accept-Language': 'en',
      },
    })
    if (res.ok) {
      const data = await res.json()
      const a = (data.address || {}) as Record<string, string>
      const barangay = pickBarangay(a)
      const city = pickCity(a)
      const province = pickProvince(a)
      const postcode = a.postcode || ''
      const country = a.country || ''
      const formatted =
        [barangay, city, province, postcode, country]
          .map((s) => String(s).trim())
          .filter(Boolean)
          .join(', ') || data.display_name || null
      if (formatted) {
        return json({ barangay, city, province, postcode, country, formatted, source: 'nominatim' })
      }
    }
  } catch (e) {
    console.warn('nominatim failed:', e)
  }

  // --- Fallback: BigDataCloud ---
  try {
    const u =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}` +
      `&longitude=${lon}&localityLanguage=en`
    const res = await fetchWithTimeout(u)
    if (res.ok) {
      const d = await res.json()
      const city = d.city || ''
      const province = d.principalSubdivision || ''
      const postcode = d.postcode || ''
      const country = d.countryName || ''
      const formatted =
        [city, province, postcode, country]
          .map((s) => String(s || '').trim())
          .filter(Boolean)
          .join(', ') || null
      if (formatted) {
        return json({ barangay: '', city, province, postcode, country, formatted, source: 'bigdatacloud' })
      }
    }
  } catch (e) {
    console.warn('bigdatacloud failed:', e)
  }

  return json({ formatted: null, source: 'coords' })
})

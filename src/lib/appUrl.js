/**
 * Helpers for building absolute URLs that go onto physical assets
 * (QR codes on printed cards, NDEF URL records on NFC tags).
 *
 * The base URL is `VITE_PUBLIC_APP_URL` (no trailing slash), e.g.
 *   https://tappe.ph
 *
 * If the env var is missing or empty (common in local dev), we fall back
 * to `window.location.origin` so `npm run dev` still produces a working
 * QR pointing at the local server.
 */

const FALLBACK = '' // window is unavailable at module-load on the server

function readOrigin() {
  const raw = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim()
  if (raw) return raw.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return FALLBACK
}

/** The base origin, e.g. `https://tappe.ph` or `http://localhost:5173`. */
export function appOrigin() {
  return readOrigin()
}

/** Build the signup URL with the activation code pre-filled. */
export function signupUrlForCode(code) {
  const base = readOrigin()
  const trimmed = (code || '').trim()
  if (!trimmed) return `${base}/signup`
  return `${base}/signup?code=${encodeURIComponent(trimmed)}`
}

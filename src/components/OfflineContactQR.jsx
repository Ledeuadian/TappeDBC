import { QRCodeSVG } from 'qrcode.react'

/**
 * Offline-scannable contact QR.
 *
 * Encodes a vCard 3.0 payload built from the card's saved phone numbers
 * (primary `phone` + any additional `phone`/`biz_phone` links). When a
 * recipient scans this with their camera (no internet required on either
 * side), their device offers to save the contact — no Tappe account or
 * app needed on their end.
 *
 * Designed to live inside the public card view, directly below the
 * additional-content section.
 *
 * @param {object} props
 * @param {object} props.card - card row from Supabase
 * @param {object} props.theme - theme colors for the surrounding card chrome
 * @returns {JSX.Element|null} null when the card has no phone numbers to encode
 */
export default function OfflineContactQR({ card, theme }) {
  if (!card) return null

  // Collect every phone number the user saved. Keep duplicates out.
  const phones = collectPhones(card)
  if (phones.length === 0) return null

  const vcard = buildVCard({
    name: card.name || '',
    phones,
  })

  return (
    <div
      className="mt-6 rounded-2xl px-4 py-5 flex flex-col items-center text-center"
      style={{
        border: `1px solid ${theme.border}`,
        background:
          card.night_mode
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(15, 23, 42, 0.03)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: theme.textMuted }}
      >
        Save offline
      </p>
      <p
        className="mt-1 text-sm font-medium"
        style={{ color: theme.text }}
      >
        Scan to save the contact
      </p>

      <div
        className="mt-4 p-3 rounded-2xl"
        style={{ background: '#ffffff' }}
      >
        <QRCodeSVG
          value={vcard}
          size={176}
          level="M"
          marginSize={0}
        />
      </div>

      <p
        className="mt-3 text-xs"
        style={{ color: theme.textMuted }}
      >
        {phones.length === 1
          ? 'Works without internet — open your camera and scan.'
          : `${phones.length} phone numbers embedded — works without internet.`}
      </p>
    </div>
  )
}

/** Collect phone numbers from the card, deduped, with the primary `phone`
 *  field first and any phone-typed saved links after. */
export function collectPhones(card) {
  const out = []
  const seen = new Set()
  const push = (raw) => {
    if (!raw) return
    const digits = String(raw).replace(/[^\d+]/g, '')
    if (!digits) return
    if (seen.has(digits)) return
    seen.add(digits)
    out.push(String(raw))
  }
  push(card.phone)
  if (Array.isArray(card.links)) {
    for (const link of card.links) {
      if (!link || (link.icon !== 'phone' && link.icon !== 'biz_phone')) continue
      const v = link.values || {}
      push(v.mobile)
      push(v.landline)
    }
  }
  return out
}

/** Build a minimal vCard 3.0 string. Most cameras and dialers import
 *  these without an internet connection.
 *
 *  Fields:
 *   - name:     string    → FN / N
 *   - company:  string    → ORG (and TITLE if `title` is provided)
 *   - title:    string    → TITLE (job title)
 *   - phones:   string[]  → TEL;TYPE=CELL
 *   - emails:   string[]  → EMAIL;TYPE=INTERNET
 *   - url:      string    → URL (card's online share link)
 *   - note:     string    → NOTE (meeting date-time + location)
 */
export function buildVCard({ name, company = '', title = '', phones = [], emails = [], url = '', note = '' }) {
  const esc = (s) =>
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(name || 'Contact')}`,
    `N:${esc(name || 'Contact')};;;;`,
    ...(company ? [`ORG:${esc(company)}`] : []),
    ...(title ? [`TITLE:${esc(title)}`] : []),
    ...phones.map((p) => `TEL;TYPE=CELL:${esc(p)}`),
    ...emails.map((e) => `EMAIL;TYPE=INTERNET:${esc(e)}`),
    ...(url ? [`URL:${esc(url)}`] : []),
    ...(note ? [`NOTE:${esc(note)}`] : []),
    'END:VCARD',
  ]
  return lines.join('\r\n')
}

/** Collect emails from the card — the primary `email` column plus any
 *  email-typed saved links (email / biz_email). Deduped. */
export function collectEmails(card) {
  const out = []
  const seen = new Set()
  const push = (raw) => {
    if (!raw) return
    const v = String(raw).trim().toLowerCase()
    if (!v || seen.has(v)) return
    seen.add(v)
    out.push(v)
  }
  push(card.email)
  if (Array.isArray(card.links)) {
    for (const link of card.links) {
      if (!link || (link.icon !== 'email' && link.icon !== 'biz_email')) continue
      push(link.values?.value)
    }
  }
  return out
}

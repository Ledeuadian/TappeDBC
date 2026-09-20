/**
 * Shared link-icon catalog for card additional content.
 * Used by both the Card Editor (picker + saved chips) and the Public Card
 * page so logos stay in sync everywhere.
 *
 * `logo` points at a PNG in public/logos; `Icon` is a lucide-react component
 * for non-brand entries; `glyph`/`color` are the fallback when the PNG
 * fails to load.
 */
import {
  Mail, Phone, Globe,
  CreditCard,
} from 'lucide-react'

export const ICON_CATEGORIES = [
  {
    id: 'recommended',
    label: 'Recommended',
    icons: [
      { key: 'phone', label: 'Phone', logo: '/logos/Phone.png', bwLogo: '/logos/Phone-B&W.png', Icon: Phone },
      { key: 'email', label: 'Email', logo: '/logos/Email.png', bwLogo: '/logos/Email-B&W.png', Icon: Mail },
      { key: 'linkedin', label: 'LinkedIn', logo: '/logos/Linkedin.png', bwLogo: '/logos/Linkedin-B&W.png', glyph: 'in', color: '#0a66c2' },
      { key: 'google', label: 'Google', logo: '/logos/Google.png', bwLogo: '/logos/Google-B&W.png', glyph: 'G', color: '#4285f4' },
      { key: 'gmap', label: 'Google Maps', logo: '/logos/Gmap.png', bwLogo: '/logos/Gmap-B&W.png', glyph: 'M', color: '#ea4335' },
    ],
  },
  {
    id: 'socials',
    label: 'Socials',
    icons: [
      { key: 'facebook', label: 'Facebook', logo: '/logos/Facebook.png', bwLogo: '/logos/Facebook-B&W.png', glyph: 'f', color: '#1877f2' },
      { key: 'tiktok', label: 'TikTok', logo: '/logos/Tiktok.png', bwLogo: '/logos/Tiktok-B&W.png', glyph: 'T', color: '#ff0050' },
      { key: 'instagram', label: 'Instagram', logo: '/logos/Instagram.png', bwLogo: '/logos/Instagram-B&W.png', glyph: 'I', color: '#e1306c' },
      { key: 'twitter', label: 'Twitter / X', logo: '/logos/X.png', bwLogo: '/logos/X-B&W.png', glyph: 'X', color: '#000000' },
      { key: 'youtube', label: 'YouTube', logo: '/logos/Youtube.png', bwLogo: '/logos/Youtube-B&W.png', glyph: 'Y', color: '#ff0000' },
      { key: 'whatsapp', label: 'WhatsApp', logo: '/logos/Whatsapp.png', bwLogo: '/logos/Whatsapp-B&W.png', glyph: 'W', color: '#25d366' },
      { key: 'telegram', label: 'Telegram', logo: '/logos/Telegram.png', bwLogo: '/logos/Telegram-B&W.png', glyph: 'T', color: '#229ed9' },
      { key: 'discord', label: 'Discord', logo: '/logos/Discord.png', bwLogo: '/logos/Discord-B&W.png', glyph: 'D', color: '#5865f2' },
      { key: 'twitch', label: 'Twitch', logo: '/logos/Twitch.png', bwLogo: '/logos/Twitch-B&W.png', glyph: 'Tw', color: '#9146ff' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icons: [
      // GCash and Maya intentionally have no B&W variant — payment brands
      // must stay full-color so they're recognizable at a glance.
      { key: 'gcash', label: 'GCash', logo: '/logos/Gcash.png', glyph: 'G', color: '#0073e6' },
      { key: 'paymaya', label: 'Maya', logo: '/logos/Maya.png', glyph: 'M', color: '#6c2bd9', Icon: CreditCard },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icons: [
      { key: 'biz_email', label: 'Email', logo: '/logos/Email.png', bwLogo: '/logos/Email-B&W.png', Icon: Mail },
      { key: 'biz_google', label: 'Google', logo: '/logos/Google.png', bwLogo: '/logos/Google-B&W.png', Icon: Globe },
      { key: 'biz_phone', label: 'Phone', logo: '/logos/Phone.png', bwLogo: '/logos/Phone-B&W.png', Icon: Phone },
    ],
  },
]

/** Flat lookup by icon key — e.g. CARD_LINK_ICONS.facebook */
export const CARD_LINK_ICONS = Object.fromEntries(
  ICON_CATEGORIES.flatMap((c) => c.icons.map((i) => [i.key, i])),
)

/** Convenience accessor with a sane default. */
export function iconFor(key) {
  return CARD_LINK_ICONS[key] || { key, label: key }
}

/** Resolve the primary display value of a saved link entry. */
export function linkValue(link) {
  const v = link?.values || {}
  if (v.qr_url) return 'QR code'
  return (
    [v.mobile, v.landline, v.value].filter(Boolean).join(' · ') || ''
  )
}

/** True when the entry should open as a URL (has a link-style value). */
export function linkHref(link) {
  const v = link?.values || {}
  const icon = link?.icon || ''
  const val = v.value || ''
  const raw = val.trim()

  // Phone entries live in `mobile`/`landline` rather than `value`
  if (icon === 'phone' || icon === 'biz_phone') {
    const phone = (v.mobile || v.landline || '').replace(/[^\d+]/g, '')
    if (phone) return `tel:${phone}`
    return null
  }

  // WhatsApp / Telegram get a wa.me / tg universal deep link so the app
  // opens on phones, fallback to web otherwise
  if (icon === 'whatsapp') {
    const phone = (v.mobile || v.value || '').replace(/[^\d]/g, '')
    if (phone) return `https://wa.me/${phone}`
    return raw ? `https://wa.me/${encodeURIComponent(raw)}` : null
  }
  if (icon === 'telegram') {
    const handle = (v.value || '').replace(/^@/, '')
    if (handle) return `https://t.me/${encodeURIComponent(handle)}`
    return null
  }

  // Discord / Twitch — value is a username, link to the canonical URL
  if (icon === 'discord') {
    return raw ? `https://discord.com/users/${encodeURIComponent(raw)}` : null
  }
  if (icon === 'twitch') {
    return raw ? `https://www.twitch.tv/${encodeURIComponent(raw)}` : null
  }

  // Social platforms accept either a full URL or a `@handle`/username.
  // Normalize to a deep URL so the platform opens directly.
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw
  }
  const handle = raw.replace(/^@/, '')
  const SOCIAL_URLS = {
    instagram: `https://instagram.com/${handle}`,
    facebook: `https://facebook.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    tiktok: `https://tiktok.com/@${handle}`,
    youtube: `https://youtube.com/@${handle}`,
    twitter: `https://x.com/${handle}`,
  }
  if (handle && SOCIAL_URLS[icon]) return SOCIAL_URLS[icon]

  // Google Maps — value is a query, link to maps search
  if (icon === 'gmap') {
    if (!raw) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`
  }

  // Generic value handling — url, email, or fall through to null
  if (raw && raw.includes('@') && !raw.includes(' ')) return `mailto:${raw}`

  return null
}

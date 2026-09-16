import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import {
  MailIcon,
  QrCodeIcon,
  ChevronRightIcon,
  UserRoundIcon,
  WifiIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useCards } from '../../context/CardContext.jsx'
import { getTheme } from '../../themes.js'
import { iconFor, linkValue, linkHref } from '../../lib/cardIcons.js'

function ContactItem({ icon, title, subtext, theme }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 shrink-0 grid place-items-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-base font-medium truncate" style={{ color: theme.text }}>{title}</p>
        {subtext && <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{subtext}</p>}
      </div>
    </div>
  )
}

/**
 * Lightweight brand glyph icons rendered as colored text.
 * (lucide-react removed brand icons in recent versions.)
 */
function Glyph({ letter, color }) {
  return (
    <span
      className="text-lg font-extrabold leading-none"
      style={{ color }}
    >
      {letter}
    </span>
  )
}

/**
 * Brand logo for a saved card link — PNG from public/logos with a colored
 * letter-glyph fallback (same pattern as the editor's BrandLogo).
 */
function LinkBrandIcon({ link, className = 'h-6 w-6', fallbackColor }) {
  const meta = iconFor(link.icon)
  // Public card uses the B&W logo variants (payments stay full-color).
  // Falls back to the color logo when no B&W asset exists.
  const src = meta.bwLogo || meta.logo
  const [failed, setFailed] = useState(false)
  if (failed) {
    if (meta.glyph) return <Glyph letter={meta.glyph} color={meta.color || fallbackColor} />
    return null
  }
  if (!src) return null
  return (
    <img
      src={src}
      alt={meta.label || ''}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
      draggable={false}
    />
  )
}

/** Friendly call-to-action titles for social links — shown instead of the
 *  raw URL value. Icons not listed fall back to the meta label. */
const LINK_TITLES = {
  instagram: 'Follow me on Instagram',
  facebook: 'Friend me on Facebook',
  twitter: 'Follow me on X',
  linkedin: 'Connect with me on LinkedIn',
  tiktok: 'Follow me on TikTok',
  youtube: 'Watch me on YouTube',
  whatsapp: 'Chat with me on WhatsApp',
  telegram: 'Message me on Telegram',
  discord: 'Join me on Discord',
  twitch: 'Watch me on Twitch',
  google: 'Find me on Google',
  gmap: 'Find me on Google Maps',
}

/** One saved additional-content entry rendered in the contact list. */
function SavedLinkItem({ link, theme, onShowQr }) {
  const meta = iconFor(link.icon)
  const value = linkValue(link)
  const href = linkHref(link)
  const isQr = !!link.values?.qr_url
  // Social links show a CTA title instead of the raw URL
  const title = LINK_TITLES[link.icon] || value || meta.label

  // Payment QR entries open the QR image instead of navigating away
  if (isQr) {
    return (
      <button
        type="button"
        onClick={() => onShowQr?.(link)}
        className="w-full text-left"
      >
        <ContactItem
          icon={<LinkBrandIcon link={link} fallbackColor={theme.accent} className="h-10 w-10" />}
          title={`Pay via ${meta.label}`}
          subtext="Tap to view QR code"
          theme={theme}
        />
      </button>
    )
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        <ContactItem
          icon={<LinkBrandIcon link={link} fallbackColor={theme.accent} className="h-10 w-10" />}
          title={title}
          // Email/phone keep the platform label as a small subtitle so the
          // user sees what kind of contact they're tapping (e.g. "Email",
          // "Phone"). Social links drop the subtitle — the CTA already says
          // the platform name.
          subtext={subtextFor(link.icon, meta.label)}
          theme={theme}
        />
      </a>
    )
  }

  return (
    <ContactItem
      icon={<LinkBrandIcon link={link} fallbackColor={theme.accent} className="h-10 w-10" />}
      title={title}
      subtext={subtextFor(link.icon, meta.label)}
      theme={theme}
    />
  )
}

/** Icons that should keep the small platform label under their value. */
const KEEP_SUBTEXT = new Set(['email', 'biz_email', 'phone', 'biz_phone'])
function subtextFor(icon, label) {
  return KEEP_SUBTEXT.has(icon) ? label : undefined
}

/** Social platforms shown in the centered layout's icon grid. */
const CENTERED_SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'twitter', 'threads', 'discord']
/** Everything else renders as a full-width row with a chevron. */
const CENTERED_ROW_KEYS = ['gmap', 'twitch', 'whatsapp', 'telegram', 'google']

/**
 * "Centered" layout variant — matches the Change Layout page design:
 * light mode → matte-black page, frame starts at the middle of the avatar;
 * night mode → single bordered frame around everything.
 */
function CenteredLayout({ card, theme, onShowQr }) {
  const cropStyle = (pos) =>
    pos
      ? {
          objectPosition: `${pos.x}% ${pos.y}%`,
          transform: `scale(${pos.scale || 1})`,
          transformOrigin: 'center',
        }
      : undefined

  // Shared body — everything below the profile picture
  const body = (
    <>
      {/* Name below the picture */}
      <h1 className="mt-4 text-2xl font-bold" style={{ color: theme.text }}>
        {card.name || 'Untitled card'}
      </h1>

      {/* @handle below the name */}
      <p className="mt-1 text-sm font-semibold" style={{ color: theme.accent }}>
        @{(card.handle || card.name || 'handle')
          .toLowerCase()
          .replace(/^@+/, '')
          .replace(/[^a-z0-9._-]+/g, '')}
      </p>

      {/* Headline — cursive, same size as the @handle line */}
      {card.headline && (
        <p
          className="mt-2 text-sm max-w-xs italic"
          style={{
            color: theme.textMuted,
            fontFamily: "'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive",
          }}
        >
          {card.headline}
        </p>
      )}

      {/* Socials — 4×2 icon grid, only social platforms */}
      {(() => {
        const links = Array.isArray(card.links) ? card.links : []
        const socials = links.filter((l) => CENTERED_SOCIAL_KEYS.includes(l.icon))
        if (socials.length === 0) return null
        return (
          <div className="mt-6 grid grid-cols-4 gap-1.5 place-items-center w-full">
            {socials.slice(0, 8).map((link, idx) => (
              <a
                key={`social-${idx}`}
                href={linkHref(link) || '#'}
                target={linkHref(link) ? '_blank' : undefined}
                rel={linkHref(link) ? 'noopener noreferrer' : undefined}
                className="h-16 w-16 rounded-xl border grid place-items-center"
                style={{
                  borderColor: card.night_mode ? '#f97316' : 'transparent',
                  background: card.night_mode ? 'rgba(255,255,255,0.04)' : '#1a1a1a',
                }}
              >
                <LinkBrandIcon link={link} fallbackColor={theme.accent} className="h-10 w-10" />
              </a>
            ))}
          </div>
        )
      })()}

      {/* Contact / payment entries — individual full-width rows */}
      {(() => {
        const links = Array.isArray(card.links) ? card.links : []
        const rows = links.filter(
          (l) =>
            ['email', 'phone', 'gcash', 'paymaya', 'biz_email', 'biz_phone', 'biz_google'].includes(l.icon) ||
            CENTERED_ROW_KEYS.includes(l.icon)
        )
        if (rows.length === 0) return null
        return (
          <div className="mt-6 w-full flex flex-col gap-2 text-left">
            {rows.map((link, idx) => {
              const meta = iconFor(link.icon)
              const isQr = !!link.values?.qr_url
              return (
                <button
                  key={`row-${idx}`}
                  type="button"
                  onClick={() => isQr && onShowQr(link)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                  style={{
                    border: `1px solid ${theme.border}`,
                    background: card.night_mode ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <LinkBrandIcon link={link} fallbackColor={theme.accent} className="h-7 w-7" />
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: theme.text }}>
                    {meta.label || link.label}
                  </span>
                  <ChevronRightIcon className="h-5 w-5 shrink-0" style={{ color: theme.textMuted }} />
                </button>
              )
            })}
          </div>
        )
      })()}

      {/* Save Contact CTA — orange pill w/ black text in night mode,
          matte black pill w/ white text in light mode */}
      <button
        type="button"
        className="mt-6 w-full rounded-full text-sm font-bold py-3.5 active:scale-[0.98] transition shadow-lg flex items-center justify-center gap-2"
        style={{
          background: card.night_mode ? '#f97316' : '#1a1a1a',
          color: card.night_mode ? '#000000' : '#ffffff',
        }}
      >
        <UserRoundIcon
          className="h-5 w-5"
          style={{ color: card.night_mode ? '#000000' : '#ffffff' }}
        />
        Save Contact
      </button>
    </>
  )

  // Shared Tappe header — left-aligned "Tappe" + wifi icon.
  const header = (
    <div className="w-full flex items-center justify-start gap-1.5">
      <span
        className="text-xl font-bold tracking-tight"
        style={{ color: card.night_mode ? theme.text : '#ffffff' }}
      >
        Tappe
      </span>
      <WifiIcon
        className="h-4 w-4 rotate-90"
        style={{ color: card.night_mode ? theme.accent : '#ffffff' }}
      />
    </div>
  )

  // Shared avatar — centered, white border in light mode only
  const avatar = card.avatar_url ? (
    <img
      src={card.avatar_url}
      alt={card.name || 'Profile'}
      loading="lazy"
      decoding="async"
      className="h-28 w-28 rounded-full object-cover"
      style={{
        border: card.night_mode ? undefined : '2px solid #ffffff',
        ...cropStyle(card.avatar_url_pos),
      }}
    />
  ) : (
    <div
      className="h-28 w-28 rounded-full grid place-items-center text-4xl font-bold"
      style={{
        background: theme.bg,
        color: theme.text,
        border: card.night_mode ? undefined : '2px solid #ffffff',
      }}
    >
      {card.name?.[0]?.toUpperCase() || '?'}
    </div>
  )

  // Night mode — single bordered frame around everything
  if (card.night_mode) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div
          className="w-full rounded-3xl px-6 pt-10 pb-6 flex flex-col items-center text-center"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        >
          {header}
          <div className="mt-4">{avatar}</div>
          {body}
        </div>
      </div>
    )
  }

  // Light mode — matte-black page, frame starts at the MIDDLE of the avatar
  return (
    <div className="w-full max-w-md mx-auto" style={{ background: 'transparent' }}>
      <div className="relative w-full pb-10">
        <div className="px-6 pt-2">{header}</div>
        <div className="-mt-2 flex justify-center">{avatar}</div>
        <div
          className="px-6 pt-20 pb-4 flex flex-col items-center text-center rounded-3xl -mt-14"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}

export default function PublicCardPage() {
  const { slug } = useParams()
  const location = useLocation()
  const { getCardBySlug } = useCards()
  // Ephemeral draft preview (passed via router state from the editor's
  // "Preview Card" button — never persisted).
  const draft = location.state?.draft || null
  // Try the cache first (works for the owner previewing their own card)
  const cached = slug && slug !== 'preview' ? getCardBySlug(slug) : null
  const [card, setCard] = useState(draft || cached)
  const [loading, setLoading] = useState(!draft && !cached)
  const [notFound, setNotFound] = useState(false)
  // Payment QR entry currently shown in the lightbox
  const [qrLink, setQrLink] = useState(null)

  // Fetch directly from Supabase — public page, no owner context, RLS-allowed
  // (the schema's "cards public select by slug" policy lets anon read
  // published cards; for owner preview we pass auth.uid() via RLS).
  // Skipped for the ephemeral draft preview (/c/preview).
  useEffect(() => {
    if (draft || slug === 'preview') return
    let mounted = true
    setLoading(true)
    setNotFound(false)

    ;(async () => {
      // Public read — only published cards. Drafts/unpublished cards are
      // owner-only via the "cards owner select" RLS policy.
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()

      if (!mounted) return
      if (error) {
        console.error('[tappe] public card fetch error', error)
        setNotFound(true)
      } else if (!data) {
        setNotFound(true)
      } else {
        setCard(data)
      }
      setLoading(false)
    })()

    return () => { mounted = false }
  }, [slug, draft])

  // Resolve theme from the card's night_mode flag
  const theme = getTheme(card?.night_mode)

  if (notFound) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: theme.pageBg }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Card not found</h1>
          <p className="mt-2" style={{ color: theme.textMuted }}>This card doesn't exist or has been removed.</p>
          <Link to="/" className="mt-6 inline-flex font-semibold" style={{ color: theme.accent }}>
            Back to Tappe
          </Link>
        </div>
      </div>
    )
  }

  if (loading || !card) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: theme.pageBg }}>
        <p className="text-sm" style={{ color: theme.textMuted }}>Loading…</p>
      </div>
    )
  }

  // Centered layout — renders whenever the card's saved layout is
  // 'centered' (owner preview, dashboard click-through, or public share).
  if (card.layout === 'centered') {
    return (
      <div
        className="min-h-screen flex flex-col transition-colors duration-300"
        style={{
          // Light mode → matte black; night mode keeps theme.pageBg
          background: card.night_mode ? theme.pageBg : '#1a1a1a',
        }}
      >
        <div className="flex-1 w-full px-5 pt-8 pb-10">
          <CenteredLayout
            card={card}
            theme={theme}
            onShowQr={(l) => setQrLink(l)}
          />
        </div>

        {/* Payment QR lightbox */}
        {qrLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setQrLink(null)}
              className="absolute inset-0 bg-black/70"
            />
            <div
              className="relative w-full max-w-xs rounded-2xl p-6 text-center"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-center justify-center gap-2">
                <LinkBrandIcon link={qrLink} fallbackColor={theme.accent} className="h-6 w-6" />
                <h3 className="text-base font-bold" style={{ color: theme.text }}>
                  {iconFor(qrLink.icon).label}
                </h3>
              </div>
              <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                Scan to pay
              </p>
              <img
                src={qrLink.values.qr_url}
                alt={`${iconFor(qrLink.icon).label} QR code`}
                loading="lazy"
                decoding="async"
                className="mt-4 mx-auto w-full max-w-[240px] rounded-xl bg-white p-2"
              />
              <button
                type="button"
                onClick={() => setQrLink(null)}
                className="mt-5 rounded-full px-5 py-2 text-sm font-bold text-white active:scale-[0.97] transition"
                style={{ background: theme.accent }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* iOS home indicator */}
        <div className="flex justify-center pb-4 shrink-0" aria-hidden="true">
          <div className="h-1.5 w-36 rounded-full" style={{ background: theme.border }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: theme.pageBg }}>
      <div className="relative flex-1 flex flex-col w-full max-w-md mx-auto pt-0">
        {/* Banner photo — rounded corners via inner wrapper so the logo isn't clipped */}
        <div className="relative h-44">
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl"
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
            }}
          >
            {card.cover_url ? (
              <img
                src={card.cover_url}
                alt={`${card.name || 'Card'} cover`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                style={
                  card.cover_url_pos
                    ? {
                        objectPosition: `${card.cover_url_pos.x}% ${card.cover_url_pos.y}%`,
                        transform: `scale(${card.cover_url_pos.scale || 1})`,
                        transformOrigin: 'center',
                      }
                    : undefined
                }
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background:
                    theme.bgStyle === 'solid' || card.night_mode
                      ? theme.bg
                      : 'linear-gradient(135deg, #312e81, #581c87, #9a3412)',
                }}
              />
            )}
          </div>
          {/* Logo chip (stock bottom-right of cover when no custom pos) */}
          {card.logo_url && card.logo_url_pos?.layoutX == null && (
            <div
              className="absolute -bottom-6 right-10 h-16 w-16 rounded-xl overflow-hidden z-30"
              style={{
                background: theme.surface,
                border: `2px solid ${theme.border}`,
              }}
            >
              <img
                src={card.logo_url}
                alt={`${card.company || 'Logo'}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: card.logo_url_pos
                    ? `${card.logo_url_pos.x}% ${card.logo_url_pos.y}%`
                    : undefined,
                  transform: card.logo_url_pos ? `scale(${card.logo_url_pos.scale || 1})` : undefined,
                  transformOrigin: 'center',
                }}
              />
            </div>
          )}
          {!card.logo_url && card.company && (
            <div
              className="absolute -bottom-6 right-10 h-16 w-16 rounded-xl grid place-items-center z-30"
              style={{ background: theme.accent }}
            >
              <span className="text-white text-xs font-bold tracking-wider">
                {card.company.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Profile picture overlapping banner — stock position when no
            custom drag pos is saved. */}
        <div className="px-6 -mt-16 relative z-10">
          {card.avatar_url && card.avatar_url_pos?.layoutX == null ? (
            <img
              src={card.avatar_url}
              alt={card.name || 'Profile'}
              loading="lazy"
              decoding="async"
              className="h-32 w-32 rounded-full object-cover"
              style={{
                border: '4px solid #ffffff',
                objectPosition: card.avatar_url_pos
                  ? `${card.avatar_url_pos.x}% ${card.avatar_url_pos.y}%`
                  : undefined,
                transform: card.avatar_url_pos ? `scale(${card.avatar_url_pos.scale || 1})` : undefined,
                transformOrigin: 'center',
              }}
            />
          ) : !card.avatar_url ? (
            <div
              className="h-32 w-32 rounded-full grid place-items-center text-4xl font-bold"
              style={{
                background: theme.surface,
                color: theme.text,
                border: '3px solid #ffffff',
              }}
            >
              {card.name?.[0]?.toUpperCase() || '?'}
            </div>
          ) : null}

          {/* Name + pronouns */}
          <div className="mt-3 flex items-baseline gap-2 flex-wrap pl-[18px]">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>{card.name}</h1>
            {card.pronouns && (
              <span className="text-sm" style={{ color: theme.textMuted }}>({card.pronouns})</span>
            )}
          </div>

          {/* Job title on its own line */}
          {card.title && (
            <p className="text-base mt-1 pl-[18px]" style={{ color: theme.text }}>
              {card.title}
            </p>
          )}

          {/* Company name on a separate line below the title */}
          {card.company && (
            <p className="text-base mt-0.5 pl-[18px]" style={{ color: theme.text }}>
              {card.company}
            </p>
          )}

          {/* Headline — muted tagline below company */}
          {card.headline && (
            <p className="text-sm mt-1 pl-[18px]" style={{ color: theme.textMuted }}>
              {card.headline}
            </p>
          )}

          {/* Accreditations — each one in its own subtle pill frame */}
          {card.accreditations && (
            <div className="mt-3 pl-[18px] flex flex-wrap gap-2">
              {card.accreditations
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean)
                .map((acc, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs font-semibold rounded-lg"
                    style={{
                      background: card.night_mode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(15, 23, 42, 0.06)',
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {acc}
                  </span>
                ))}
            </div>
          )}

          {/* Tagline / bio */}
          {card.bio && <p className="text-sm mt-2 italic" style={{ color: theme.textMuted }}>{card.bio}</p>}

          {/* Save Contact CTA — black in light mode, strong orange in night */}
          <button
            className="w-[calc(100%-36px)] mt-5 rounded-2xl text-sm font-bold py-3.5 active:scale-[0.98] transition shadow-lg ml-[18px]"
            style={{
              background: card.night_mode ? '#ea580c' : '#0f172a',
              color: '#ffffff',
              border: `1px solid ${card.night_mode ? '#c2410c' : '#1e293b'}`,
            }}
          >
            Save Contact
          </button>

          {/* Contact list */}
          <div className="mt-6 space-y-5 pb-6">
            {card.email && (
              <ContactItem
                icon={<MailIcon className="h-5 w-5" style={{ color: theme.accent }} />}
                title={card.email}
                subtext="Work"
                theme={theme}
              />
            )}
            {/* Any extra email entries from the saved-link picker render
                immediately below the primary email row — before Address. */}
            {Array.isArray(card.links) && card.links.length > 0 && (() => {
              const emailLinks = card.links.filter(
                (l) => l.icon === 'email' || l.icon === 'biz_email'
              )
              if (emailLinks.length === 0) return null
              return emailLinks.map((link, idx) => (
                <SavedLinkItem
                  key={`email-${idx}`}
                  link={link}
                  theme={theme}
                  onShowQr={(l) => setQrLink(l)}
                />
              ))
            })()}
            {card.address && (
              <ContactItem
                icon={<LinkBrandIcon link={{ icon: 'gmap' }} fallbackColor={theme.accent} className="h-10 w-10" />}
                title={card.address}
                subtext="Home Address"
                theme={theme}
              />
            )}
            {/* Remaining saved links — phone entries hoisted above the rest,
                then everything else in original order. */}
            {Array.isArray(card.links) && card.links.length > 0 && (() => {
              const taken = (l) =>
                l.icon === 'email' || l.icon === 'biz_email'
              const phoneLinks = card.links.filter(
                (l) => !taken(l) && (l.icon === 'phone' || l.icon === 'biz_phone')
              )
              const otherLinks = card.links.filter(
                (l) => !taken(l) && l.icon !== 'phone' && l.icon !== 'biz_phone'
              )
              return (
                <div className="space-y-5">
                  {phoneLinks.map((link, idx) => (
                    <SavedLinkItem
                      key={`phone-${idx}`}
                      link={link}
                      theme={theme}
                      onShowQr={(l) => setQrLink(l)}
                    />
                  ))}
                  {otherLinks.map((link, idx) => (
                    <SavedLinkItem
                      key={`link-${idx}`}
                      link={link}
                      theme={theme}
                      onShowQr={(l) => setQrLink(l)}
                    />
                  ))}
                </div>
              )
            })()}

            <ContactItem
              icon={<QrCodeIcon className="h-5 w-5" style={{ color: theme.text }} />}
              title="View QR Code"
              theme={theme}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-right">
          <span className="text-xs font-medium" style={{ color: theme.text }}>Ready to Tappe?</span>
        </div>

        {/* Custom drag positions — overlaid on the whole card.
            Positions are a % of the FULL card (cover + content),
            matching the Change Layout page's drag coordinate space. */}
        {card.avatar_url && card.avatar_url_pos?.layoutX != null && (
          <img
            src={card.avatar_url}
            alt={card.name || 'Profile'}
            loading="lazy"
            decoding="async"
            className="absolute h-32 w-32 rounded-full object-cover z-30"
            style={{
              left: `${card.avatar_url_pos.layoutX}%`,
              top: `${card.avatar_url_pos.layoutY}%`,
              border: '4px solid #ffffff',
              objectPosition: `${card.avatar_url_pos.x}% ${card.avatar_url_pos.y}%`,
              transform: `scale(${card.avatar_url_pos.scale || 1})`,
              transformOrigin: 'center',
            }}
          />
        )}
        {card.logo_url && card.logo_url_pos?.layoutX != null && (
          <div
            className="absolute h-16 w-16 rounded-xl overflow-hidden z-30"
            style={{
              left: `${card.logo_url_pos.layoutX}%`,
              top: `${card.logo_url_pos.layoutY}%`,
              background: theme.surface,
              border: `2px solid ${theme.border}`,
            }}
          >
            <img
              src={card.logo_url}
              alt={`${card.company || 'Logo'}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${card.logo_url_pos.x}% ${card.logo_url_pos.y}%`,
                transform: `scale(${card.logo_url_pos.scale || 1})`,
                transformOrigin: 'center',
              }}
            />
          </div>
        )}
      </div>

      {/* Payment QR lightbox — shown when a payment entry is tapped */}
      {qrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setQrLink(null)}
            className="absolute inset-0 bg-black/70"
          />
          <div
            className="relative w-full max-w-xs rounded-2xl p-6 text-center"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center justify-center gap-2">
              <LinkBrandIcon link={qrLink} fallbackColor={theme.accent} className="h-6 w-6" />
              <h3 className="text-base font-bold" style={{ color: theme.text }}>
                {iconFor(qrLink.icon).label}
              </h3>
            </div>
            <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
              Scan to pay
            </p>
            <img
              src={qrLink.values.qr_url}
              alt={`${iconFor(qrLink.icon).label} QR code`}
              loading="lazy"
              decoding="async"
              className="mt-4 mx-auto w-full max-w-[240px] rounded-xl bg-white p-2"
            />
            <button
              type="button"
              onClick={() => setQrLink(null)}
              className="mt-5 rounded-full px-5 py-2 text-sm font-bold text-white active:scale-[0.97] transition"
              style={{ background: theme.accent }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* iOS home indicator */}
      <div className="flex justify-center pb-4 shrink-0" aria-hidden="true">
        <div className="h-1.5 w-36 rounded-full" style={{ background: theme.border }} />
      </div>
    </div>
  )
}

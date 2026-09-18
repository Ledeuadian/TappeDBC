import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { MailIcon, QrCodeIcon, ChevronRightIcon, UserRoundIcon, WifiIcon } from 'lucide-react'
import { useCards } from '../../context/CardContext.jsx'
import { getTheme } from '../../themes.js'
import { iconFor, linkValue } from '../../lib/cardIcons.js'

/** Contact row — same shape as the public preview's ContactItem. */
function ContactItem({ icon, title, subtext, theme }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 shrink-0 grid place-items-center">{icon}</div>
      <div className="min-w-0">
        <p className="text-base font-medium truncate" style={{ color: theme.text }}>{title}</p>
        {subtext && <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{subtext}</p>}
      </div>
    </div>
  )
}

/** Brand logo for a saved link — B&W variant with glyph fallback. */
function LinkBrandIcon({ icon, className = 'h-6 w-6', fallbackColor }) {
  const meta = iconFor(icon)
  const src = meta.bwLogo || meta.logo
  const [failed, setFailed] = useState(false)
  if (failed) {
    if (meta.glyph) {
      return (
        <span className="text-lg font-extrabold leading-none" style={{ color: meta.color || fallbackColor }}>
          {meta.glyph}
        </span>
      )
    }
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

/** One additional-content entry rendered in the contact list. */
function SavedLinkItem({ link, theme }) {
  const meta = iconFor(link.icon)
  const value = linkValue(link)
  const subtext = ['email', 'biz_email', 'phone', 'biz_phone'].includes(link.icon) ? meta.label : undefined
  return (
    <ContactItem
      icon={<LinkBrandIcon icon={link.icon} fallbackColor={theme.accent} className="h-10 w-10" />}
      title={meta.label}
      subtext={value || subtext}
      theme={theme}
    />
  )
}

/**
 * Change Layout page — opens like the public preview. The user just
 * picks the layout variant (Standard or Centered). Standard keeps the
 * profile picture and logo in their fixed stock positions, exactly as
 * they appear on the published public page.
 */

/** Crop object style — same math as the editor/BusinessCard. */
function cropStyle(pos) {
  if (!pos) return undefined
  return {
    objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale || 1})`,
    transformOrigin: 'center',
  }
}

export default function CardLayoutPage() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = cardId === 'new'
  const { getCard, updateCard } = useCards()

  const card = location.state?.draft || (!isNew ? getCard(cardId) : null) || {}
  const theme = getTheme(card.night_mode)

  const [saving, setSaving] = useState(false)
  const [layoutSheetOpen, setLayoutSheetOpen] = useState(true)

  // Layout variant — 'standard' (fixed avatar/logo positions) or 'centered'
  const [layoutId, setLayoutId] = useState(card.layout === 'centered' ? 'centered' : 'standard')

  const isDarkSheet = layoutId === 'centered' && !card.night_mode
  const sheetText = isDarkSheet ? '#f8fafc' : theme.text
  const sheetMuted = isDarkSheet ? '#cbd5e1' : theme.textMuted

  const layoutOptions = [
    { id: 'standard', label: 'Standard', hint: 'Cover photo' },
    { id: 'centered', label: 'Centered', hint: 'Social frame' },
  ]

  const handleCancel = () => {
    navigate(isNew ? '/dashboard/cards/new' : `/dashboard/cards/${cardId}`, { replace: true })
  }

  const handleSave = async () => {
    // Standard layout keeps the stock avatar/logo positions, so we just
    // persist the chosen variant.
    const payload = { layout: layoutId }

    // For an unsaved draft (no id yet) we can't persist — return the
    // updated draft to the editor via router state instead.
    if (isNew || !cardId || cardId === 'undefined' || cardId === 'null') {
      navigate('/dashboard/cards/new', {
        replace: true,
        state: {
          layoutDraft: payload,
        },
      })
      return
    }
    setSaving(true)
    try {
      await updateCard(cardId, payload)
      navigate(`/dashboard/cards/${cardId}`, {
        replace: true,
        state: {
          layoutDraft: payload,
        },
      })
    } catch (err) {
      console.error('[tappe] layout save failed:', err)
      alert('Save failed: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      // Centered + light mode: page background becomes matte black
      style={{
        background:
          layoutId === 'centered' && !card.night_mode ? '#1a1a1a' : theme.bg,
      }}
    >
      {/* Nav bar: Cancel / Tappe / Save — mirrors the editor */}
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={handleCancel} className="text-sm" style={{ color: theme.textMuted }}>
          Cancel
        </button>
        <span className="font-bold" style={{ color: theme.text }}>Change Layout</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-semibold disabled:opacity-50"
          style={{ color: theme.accent }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      <main className="flex-1 px-5 pb-10 flex flex-col items-center">
        {layoutId === 'centered' ? (
          (() => {
            /* ----------------------------------------------------------
               Layout 2 — "Centered": profile picture in the middle, name
               below it, @handle, headline, then social icons inside a
               rounded box frame. No draggable elements.

               Light mode: the frame is split — Tappe header + avatar sit
               above the border, and the bordered section starts at the
               MIDDLE of the profile picture (-mt-14).

               Night mode: a single bordered frame around the whole card.
               ---------------------------------------------------------- */

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
                    style={{ color: theme.textMuted, fontFamily: "'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive" }}
                  >
                    {card.headline}
                  </p>
                )}

                {/* Socials — only social platforms in the 4×2 icon grid.
                    Email / phone / payments / maps etc. go into the
                    full-width field rows below. */}
                {(() => {
                  const SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'twitter', 'threads', 'discord']
                  const links = Array.isArray(card.links) ? card.links : []
                  const socials = links.filter((l) => SOCIAL_KEYS.includes(l.icon))
                  if (socials.length === 0) {
                    return (
                      <p className="mt-6 text-xs" style={{ color: theme.textMuted }}>
                        No socials yet — add them in the editor.
                      </p>
                    )
                  }
                  return (
                    <div className="mt-6 grid grid-cols-4 gap-1.5 place-items-center">
                      {socials.slice(0, 8).map((link, idx) => (
                        <div
                          key={idx}
                          className="h-16 w-16 rounded-xl border grid place-items-center"
                          style={{
                            borderColor: card.night_mode ? '#f97316' : 'transparent',
                            background: card.night_mode
                              ? 'rgba(255,255,255,0.04)'
                              : '#1a1a1a',
                          }}
                        >
                          <LinkBrandIcon icon={link.icon} fallbackColor={theme.accent} className="h-10 w-10" />
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Contact / payment entries — individual full-width rows */}
                {(() => {
                  const links = Array.isArray(card.links) ? card.links : []
                  const rows = links.filter((l) => {
                    if (['email', 'phone', 'gcash', 'paymaya', 'biz_email', 'biz_phone', 'biz_google'].includes(l.icon)) return true
                    return ['gmap', 'twitch', 'whatsapp', 'telegram', 'google'].includes(l.icon)
                  })
                  if (rows.length === 0) return null
                  return (
                    <div className="mt-6 w-full flex flex-col gap-2 text-left">
                      {rows.map((link, idx) => {
                        const meta = iconFor(link.icon)
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                            style={{
                              border: `1px solid ${theme.border}`,
                              background: card.night_mode ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.02)',
                            }}
                          >
                            <LinkBrandIcon icon={link.icon} fallbackColor={theme.accent} className="h-7 w-7" />
                            <span className="flex-1 text-sm font-medium truncate" style={{ color: theme.text }}>
                              {meta.label || link.label}
                            </span>
                            <ChevronRightIcon className="h-5 w-5 shrink-0" style={{ color: theme.textMuted }} />
                          </div>
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
                alt="Profile"
                draggable={false}
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
                <div
                  className="w-full max-w-md rounded-3xl px-6 pt-10 pb-6 flex flex-col items-center text-center"
                  style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                >
                  {header}
                  <div className="mt-4">{avatar}</div>
                  {body}
                </div>
              )
            }

            // Light mode — frame border starts at the MIDDLE of the avatar:
            // header + top half of the avatar sit above the frame, the
            // bordered section is pulled up (-mt-14) to cross the avatar.
            return (
              <div className="relative w-full max-w-md pb-10">
                <div className="px-6 pt-2">{header}</div>
                <div className="-mt-2 flex justify-center">{avatar}</div>
                <div
                  className="px-6 pt-20 pb-4 flex flex-col items-center text-center rounded-3xl -mt-14"
                  style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                >
                  {body}
                </div>
              </div>
            )
          })()
        ) : (
        /* The card — identical markup/sizes to the public preview hero. */
        <div className="relative w-full max-w-md">
          {/* Banner photo — rounded corners via inner wrapper (h-44 like preview) */}
          <div className="relative h-44">
            <div
              className="absolute inset-0 overflow-hidden rounded-3xl"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
            >
              {card.cover_url ? (
                <img
                  src={card.cover_url}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover pointer-events-none"
                  style={cropStyle(card.cover_url_pos)}
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: card.night_mode
                      ? theme.bg
                      : 'linear-gradient(135deg, #312e81, #581c87, #9a3412)',
                  }}
                />
              )}
            </div>

            {/* Logo chip — fixed bottom-right of cover (matches the public preview) */}
            {card.logo_url && (
              <div
                className="absolute -bottom-6 right-10 h-16 w-16 rounded-xl overflow-hidden z-30"
                style={{ background: theme.surface, border: `2px solid ${theme.border}` }}
              >
                <img
                  src={card.logo_url}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                  style={cropStyle(card.logo_url_pos)}
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

          {/* Text content — same sizes / spacing / padding as the preview */}
          <div className="px-6 -mt-16 relative z-10">
            {/* Profile picture — fixed position overlapping the cover (matches the public preview) */}
            {card.avatar_url ? (
              <img
                src={card.avatar_url}
                alt="Profile"
                draggable={false}
                className="h-32 w-32 rounded-full object-cover"
                style={{
                  border: '4px solid #ffffff',
                  ...cropStyle(card.avatar_url_pos),
                }}
              />
            ) : (
              <div
                className="h-32 w-32 rounded-full grid place-items-center text-4xl font-bold"
                style={{
                  background: theme.surface,
                  color: theme.text,
                  border: '4px solid #ffffff',
                }}
              >
                {card.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}

            {/* Name + pronouns */}
            <div className="mt-3 flex items-baseline gap-2 flex-wrap pl-[18px]">
              <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                {card.name || 'Untitled card'}
              </h1>
              {card.pronouns && (
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  ({card.pronouns})
                </span>
              )}
            </div>

            {card.title && (
              <p className="text-base mt-1 pl-[18px]" style={{ color: '#ffffff' }}>
                {card.title}
              </p>
            )}
            {card.company && (
              <p className="text-base mt-0.5 pl-[18px]" style={{ color: '#ffffff' }}>
                {card.company}
              </p>
            )}
            {card.headline && (
              <p className="text-sm mt-1 pl-[18px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                {card.headline}
              </p>
            )}

            {/* Accreditations pills — same as the preview */}
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
                          : 'rgba(255,255,255,0.10)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.18)',
                      }}
                    >
                      {acc}
                    </span>
                  ))}
              </div>
            )}

            {/* Tagline / bio */}
            {card.bio && (
              <p className="text-sm mt-2 italic" style={{ color: 'rgba(255,255,255,0.78)' }}>{card.bio}</p>
            )}

            {/* Save Contact CTA — same colors as the preview */}
            <button
              type="button"
              className="w-[calc(100%-36px)] mt-5 rounded-2xl text-sm font-bold py-3.5 active:scale-[0.98] transition shadow-lg ml-[18px]"
              style={{
                background: card.night_mode ? '#ea580c' : '#0f172a',
                color: '#ffffff',
                border: `1px solid ${card.night_mode ? '#c2410c' : '#1e293b'}`,
              }}
            >
              Save Contact
            </button>

            {/* Contact list — same ordering as the preview (email links,
                address, phone links, everything else, View QR) */}
            <div className="mt-6 space-y-5 pb-6">
              {card.email && (
                <ContactItem
                  icon={<MailIcon className="h-5 w-5" style={{ color: theme.accent }} />}
                  title={card.email}
                  subtext="Work"
                  theme={theme}
                />
              )}
              {Array.isArray(card.links) && card.links.length > 0 && (() => {
                const emailLinks = card.links.filter(
                  (l) => l.icon === 'email' || l.icon === 'biz_email'
                )
                if (emailLinks.length === 0) return null
                return emailLinks.map((link, idx) => (
                  <SavedLinkItem key={`email-${idx}`} link={link} theme={theme} />
                ))
              })()}
              {card.address && (
                <ContactItem
                  icon={<LinkBrandIcon icon="gmap" fallbackColor={theme.accent} className="h-10 w-10" />}
                  title={card.address}
                  subtext="Home Address"
                  theme={theme}
                />
              )}
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
                      <SavedLinkItem key={`phone-${idx}`} link={link} theme={theme} />
                    ))}
                    {otherLinks.map((link, idx) => (
                      <SavedLinkItem key={`link-${idx}`} link={link} theme={theme} />
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

          {/* Footer — same as the preview */}
          <div className="px-6 py-4 text-right">
            <span className="text-xs font-medium" style={{ color: theme.text }}>Ready to Tappe?</span>
          </div>

          {/* iOS home indicator — same as the preview */}
          <div className="flex justify-center pb-4" aria-hidden="true">
            <div className="h-1.5 w-36 rounded-full" style={{ background: theme.border }} />
          </div>
        </div>
        )}

      </main>

      <div className="fixed inset-0 z-40 pointer-events-none">
        <div
          className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${layoutSheetOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setLayoutSheetOpen(false)}
        />

        <div
          className={`pointer-events-auto absolute inset-x-0 bottom-0 mx-auto max-w-md w-full rounded-t-[28px] border px-4 pb-6 pt-3 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-out ${layoutSheetOpen ? 'translate-y-0' : 'translate-y-[72%]'}`}
          style={{
            background: isDarkSheet ? 'rgba(18, 18, 18, 0.82)' : 'rgba(15, 23, 42, 0.62)',
            borderColor: isDarkSheet ? 'rgba(255,255,255,0.18)' : theme.border,
            color: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={() => setLayoutSheetOpen((v) => !v)}
            aria-label={layoutSheetOpen ? 'Hide layout options' : 'Show layout options'}
            className="mx-auto block h-1 w-10 rounded-full transition active:scale-95"
            style={{ background: isDarkSheet ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.55)' }}
          />

          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: '#f8fafc' }}>
            Card layout
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {layoutOptions.map((opt) => {
              const isActive = layoutId === opt.id
              const tileBg = isActive
                ? theme.accent
                : opt.id === 'standard'
                  ? '#ffffff'
                  : '#f1f5f9'
              const tileText = isActive
                ? '#ffffff'
                : opt.id === 'standard'
                  ? '#0f172a'
                  : '#475569'
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setLayoutId(opt.id)
                    setLayoutSheetOpen(true)
                  }}
                  className="rounded-2xl border p-3 text-left transition-all duration-200"
                  style={{
                    borderColor: isActive ? theme.accent : 'rgba(15,23,42,0.08)',
                    background: tileBg,
                    color: tileText,
                    boxShadow: isActive ? `0 0 0 1px ${theme.accent} inset` : 'none',
                  }}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="mt-1 text-[11px]" style={{ color: tileText, opacity: 0.85 }}>
                    {opt.hint}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setLayoutSheetOpen(false)}
            className="mt-5 w-full rounded-full py-3 text-sm font-bold active:scale-[0.98] transition shadow-lg"
            style={{ background: theme.accent, color: '#ffffff' }}
          >
            Choose layout
          </button>
        </div>
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
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
 * Change Layout page — opens like the preview, but the profile picture
 * and logo are freely draggable. The user can drop them anywhere on the
 * card (over the cover photo or below it). Positions are saved as
 * percentages (layoutX / layoutY) inside the existing *_url_pos JSONB
 * columns, so no schema change is needed.
 *
 * Defaults mirror the standard BusinessCard layout:
 *   avatar: left ~5.5%, top ~30% (overlapping the cover)
 *   logo:   left ~78%,  top ~45%
 */

// Default placements (percent of card width/height) — match the stock
// BusinessCard look so untouched cards render exactly as before. Public
// preview anchors:
//   avatar: bottom-left of cover overlap (~ 12.5%, 40%)
//   logo:   bottom-right of cover (~ 75%, 55%)
const DEFAULT_LAYOUTS = {
  avatar: { x: 12.5, y: 40 },
  logo: { x: 75, y: 55 },
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** Initial layout state for one element — saved pos wins, else default. */
function initialLayout(pos, key) {
  const d = DEFAULT_LAYOUTS[key]
  if (pos && typeof pos.layoutX === 'number' && typeof pos.layoutY === 'number') {
    return { x: pos.layoutX, y: pos.layoutY }
  }
  return { ...d }
}

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

  // Live drag positions — saved only when the user taps Save
  const [layout, setLayout] = useState({
    avatar: initialLayout(card.avatar_url_pos, 'avatar'),
    logo: initialLayout(card.logo_url_pos, 'logo'),
  })
  const [saving, setSaving] = useState(false)

  // Layout variant — 'standard' (draggable avatar/logo) or 'centered'
  const [layoutId, setLayoutId] = useState(card.layout === 'centered' ? 'centered' : 'standard')

  // The card surface — drag coordinates are measured against it
  const cardRef = useRef(null)
  // { key, offsetX, offsetY } while dragging
  const dragRef = useRef(null)

  const handleCancel = () => {
    navigate(isNew ? '/dashboard/cards/new' : `/dashboard/cards/${cardId}`, { replace: true })
  }

  const startDrag = (e, key) => {
    e.preventDefault()
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    // Grab offset (in % of card) between the pointer and the element's
    // CURRENT layout position — derived from state, not the bounding
    // rect (which includes the crop scale transform and would jump).
    const cur = layout[key]
    dragRef.current = {
      key,
      rect,
      offX: ((e.clientX - rect.left) / rect.width) * 100 - cur.x,
      offY: ((e.clientY - rect.top) / rect.height) * 100 - cur.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const moveDrag = (e) => {
    const d = dragRef.current
    if (!d) return
    // Ignore sub-pixel jitter so a plain click never nudges the element
    if (!d.moved && Math.abs(e.clientX - d.startX) < 2 && Math.abs(e.clientY - d.startY) < 2) {
      return
    }
    d.moved = true
    const px = ((e.clientX - d.rect.left) / d.rect.width) * 100
    const py = ((e.clientY - d.rect.top) / d.rect.height) * 100
    setLayout((l) => ({
      ...l,
      [d.key]: {
        // Keep the grab offset, clamp inside the card
        x: clamp(px - d.offX, -6, 100),
        y: clamp(py - d.offY, -4, 96),
      },
    }))
  }

  const endDrag = (e) => {
    const d = dragRef.current
    if (!d) return
    e.currentTarget?.releasePointerCapture?.(e.pointerId)
    dragRef.current = null
  }

  const handleSave = async () => {
    // Persist drag positions as layoutX/layoutY — keeping the crop x/y
    // (used by object-position) intact. This is what every reader
    // (BusinessCard, PublicCardPage) keys off: `layoutX != null`.
    const positions = {
      avatar_url_pos: {
        ...(card.avatar_url_pos || {}),
        layoutX: layout.avatar.x,
        layoutY: layout.avatar.y,
      },
      logo_url_pos: {
        ...(card.logo_url_pos || {}),
        layoutX: layout.logo.x,
        layoutY: layout.logo.y,
      },
    }

    // For an unsaved draft (no id yet) we can't persist — return the
    // updated draft to the editor via router state instead.
    if (isNew || !cardId || cardId === 'undefined' || cardId === 'null') {
      navigate('/dashboard/cards/new', {
        replace: true,
        state: {
          layoutDraft: {
            ...positions,
            layout: layoutId,
          },
        },
      })
      return
    }
    setSaving(true)
    try {
      await updateCard(cardId, {
        ...positions,
        layout: layoutId,
      })
      navigate(`/dashboard/cards/${cardId}`, {
        replace: true,
        state: {
          layoutDraft: {
            ...positions,
            layout: layoutId,
          },
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
        {layoutId !== 'centered' && (
          <p className="mb-4 text-sm text-center" style={{ color: theme.textMuted }}>
            Drag your profile picture and logo anywhere on the card.
          </p>
        )}

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
        /* The card — identical markup/sizes to the public preview hero.
            Drag positions are a % of this container. */
        <div
          ref={cardRef}
          className="relative w-full max-w-md touch-none select-none"
        >
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
          </div>

          {/* Text content — same sizes / spacing / padding as the preview */}
          <div className="px-6 -mt-16 relative z-10">
            {/* Static avatar placeholder spot — keeps text spacing stable
                when the avatar is dragged elsewhere */}
            {card.avatar_url && (
              <div className="h-32 w-32 invisible" aria-hidden="true" />
            )}
            {!card.avatar_url && (
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
            )}

            {/* Name + pronouns */}
            <div className="mt-3 flex items-baseline gap-2 flex-wrap pl-[18px]">
              <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
                {card.name || 'Untitled card'}
              </h1>
              {card.pronouns && (
                <span className="text-sm" style={{ color: theme.textMuted }}>
                  ({card.pronouns})
                </span>
              )}
            </div>

            {card.title && (
              <p className="text-base mt-1 pl-[18px]" style={{ color: theme.text }}>
                {card.title}
              </p>
            )}
            {card.company && (
              <p className="text-base mt-0.5 pl-[18px]" style={{ color: theme.text }}>
                {card.company}
              </p>
            )}
            {card.headline && (
              <p className="text-sm mt-1 pl-[18px]" style={{ color: theme.textMuted }}>
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
            {card.bio && (
              <p className="text-sm mt-2 italic" style={{ color: theme.textMuted }}>{card.bio}</p>
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

          {/* Draggable profile picture — same size/ring as the preview (h-32, 4px ring) */}
          {card.avatar_url && (
            <img
              src={card.avatar_url}
              alt="Profile"
              draggable={false}
              onPointerDown={(e) => startDrag(e, 'avatar')}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute h-32 w-32 rounded-full object-cover cursor-grab active:cursor-grabbing touch-none z-30"
              style={{
                left: `${layout.avatar.x}%`,
                top: `${layout.avatar.y}%`,
                border: '4px solid #ffffff',
                ...cropStyle(card.avatar_url_pos),
              }}
            />
          )}

          {/* Draggable logo — same size/ring as the preview (h-16) */}
          {card.logo_url && (
            <img
              src={card.logo_url}
              alt="Logo"
              draggable={false}
              onPointerDown={(e) => startDrag(e, 'logo')}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute h-16 w-16 rounded-xl object-cover cursor-grab active:cursor-grabbing touch-none z-30"
              style={{
                left: `${layout.logo.x}%`,
                top: `${layout.logo.y}%`,
                border: `2px solid ${theme.border}`,
                background: theme.surface,
                ...cropStyle(card.logo_url_pos),
              }}
            />
          )}
        </div>
        )}

        {/* Layout picker — radio buttons at the bottom */}
        <div
          className="mt-6 w-full max-w-md rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
            Card layout
          </p>
          {[
            { id: 'standard', label: 'Standard', hint: 'Cover photo, draggable profile & logo' },
            { id: 'centered', label: 'Centered', hint: 'Profile centered with socials frame' },
          ].map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-3 cursor-pointer"
              style={{ color: theme.text }}
            >
              <input
                type="radio"
                name="card-layout"
                value={opt.id}
                checked={layoutId === opt.id}
                onChange={() => setLayoutId(opt.id)}
                className="h-4 w-4 accent-orange-600"
                style={{ accentColor: theme.accent }}
              />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs" style={{ color: theme.textMuted }}>{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {layoutId === 'standard' && (
          <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
            Tip: drag the images onto the cover photo or anywhere below it.
          </p>
        )}
      </main>
    </div>
  )
}

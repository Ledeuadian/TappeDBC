import { getTheme } from '../themes.js'

/**
 * Dashboard card preview — mirrors the public card style exactly.
 * Shows the uploaded cover photo, logo, and profile image with their
 * crop positions and the user-saved layout positions. The card surface
 * uses the active theme (day/night) so the user can see what the public
 * link will look like.
 */
export default function BusinessCard({ card, className = '' }) {
  const theme = getTheme(card?.night_mode)
  const ringColor = theme.border
  const profileRing = '3px solid #ffffff'

  const cropStyle = (pos) =>
    pos
      ? {
          objectPosition: `${pos.x}% ${pos.y}%`,
          transform: `scale(${pos.scale || 1})`,
          transformOrigin: 'center',
        }
      : undefined

  // Has the user dragged the avatar/logo onto a custom position?
  const avatarPos = card.avatar_url_pos
  const logoPos = card.logo_url_pos
  const hasAvatarPos =
    avatarPos && typeof avatarPos.layoutX === 'number' && typeof avatarPos.layoutY === 'number'
  const hasLogoPos =
    logoPos && typeof logoPos.layoutX === 'number' && typeof logoPos.layoutY === 'number'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-colors ${className}`}
      style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
    >
      {/* Cover photo */}
      <div className="relative h-32">
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl"
          style={{ background: theme.surface }}
        >
          {card.cover_url ? (
            <img
              src={card.cover_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
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

      {/* Profile + content */}
      <div className="px-5 pb-5 -mt-9 relative">
        {/* Profile picture — stock position unless the user dragged it */}
        {card.avatar_url && !hasAvatarPos && (
          <img
            src={card.avatar_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-16 w-16 rounded-full object-cover relative z-10"
            style={{
              border: profileRing,
              ...cropStyle(card.avatar_url_pos),
            }}
          />
        )}
        {!card.avatar_url && (
          <div
            className="h-16 w-16 rounded-full grid place-items-center text-xl font-bold relative z-10"
            style={{ background: theme.surface, color: theme.text, border: profileRing }}
          >
            {card.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Logo — stock position unless the user dragged it */}
        {card.logo_url && !hasLogoPos && (
          <div
            className="absolute top-3 right-8 h-12 w-12 rounded-xl overflow-hidden"
            style={{ background: theme.surface, border: `2px solid ${ringColor}` }}
          >
            <img
              src={card.logo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={cropStyle(card.logo_url_pos)}
            />
          </div>
        )}

        {/* Name + pronouns */}
        <div className="pl-20">
          <h3 className="mt-3 text-base font-bold" style={{ color: theme.text }}>
            {card.name || 'Untitled card'}
          </h3>
          {card.pronouns && (
            <span className="text-xs" style={{ color: theme.textMuted }}>
              ({card.pronouns})
            </span>
          )}
          {card.title && (
            <p className="text-sm mt-0.5" style={{ color: theme.text }}>
              {card.title}
            </p>
          )}
          {card.company && (
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {card.company}
            </p>
          )}
          {card.headline && (
            <p className="text-sm mt-2" style={{ color: theme.textMuted }}>
              {card.headline}
            </p>
          )}
        </div>
      </div>

      {/* Dragged-to custom positions — overlaid on the whole card
          (positions are a % of the FULL card: cover + content, matching
          the Change Layout page's drag coordinate space). */}
      {card.avatar_url && hasAvatarPos && (
        <img
          src={card.avatar_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute h-16 w-16 rounded-full object-cover z-20"
          style={{
            left: `${avatarPos.layoutX}%`,
            top: `${avatarPos.layoutY}%`,
            border: profileRing,
            ...cropStyle(avatarPos),
          }}
        />
      )}
      {card.logo_url && hasLogoPos && (
        <div
          className="absolute h-12 w-12 rounded-xl overflow-hidden z-20"
          style={{
            left: `${logoPos.layoutX}%`,
            top: `${logoPos.layoutY}%`,
            background: theme.surface,
            border: `2px solid ${ringColor}`,
          }}
        >
          <img
            src={card.logo_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={cropStyle(logoPos)}
          />
        </div>
      )}
    </div>
  )
}


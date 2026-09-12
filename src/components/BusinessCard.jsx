import { getTheme } from '../themes.js'

/**
 * Dashboard card preview — mirrors the public card style exactly.
 * Shows the uploaded cover photo, logo, and profile image with their
 * crop positions. The card surface uses the active theme (day/night)
 * so the user can see what the public link will look like.
 */
export default function BusinessCard({ card, className = '' }) {
  const theme = getTheme(card?.night_mode)
  // Light theme: grey stroke around profile/logo for a softer editor preview.
  // Dark theme: white stroke (matches night surface).
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

  return (
    <div
      className={`overflow-hidden rounded-2xl transition-colors ${className}`}
      style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
    >
      {/* Cover photo — rounded top corners via inner clip wrapper */}
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
        {/* Profile picture — white ring in both modes */}
        {card.avatar_url ? (
          <img
            src={card.avatar_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-16 w-16 rounded-full object-cover"
            style={{
              border: profileRing,
              ...cropStyle(card.avatar_url_pos),
            }}
          />
        ) : (
          <div
            className="h-16 w-16 rounded-full grid place-items-center text-xl font-bold"
            style={{
              background: theme.surface,
              color: theme.text,
              border: profileRing,
            }}
          >
            {card.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Logo — top-right of the content block */}
        {card.logo_url && (
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

        {/* Title */}
        {card.title && (
          <p className="text-sm mt-0.5" style={{ color: theme.text }}>
            {card.title}
          </p>
        )}

        {/* Company — white in both modes, per public preview */}
        {card.company && (
          <p className="text-sm" style={{ color: '#ffffff' }}>
            {card.company}
          </p>
        )}

        {/* Headline */}
        {card.headline && (
          <p className="text-sm mt-2" style={{ color: theme.textMuted }}>
            {card.headline}
          </p>
        )}
        </div>
      </div>
    </div>
  )
}

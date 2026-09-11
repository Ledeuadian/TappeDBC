/**
 * Card theme presets — exported so editor preview and public page can stay in sync.
 * `night_mode: true` on a card selects the Night variant of every palette.
 */

export const THEMES = {
  // ─── Day (light background) ────────────────────────────────
  day: {
    // Card surface
    bgStyle: 'solid',
    bg: '#f8fafc',          // slate-50 page
    surface: '#ffffff',     // card panel
    border: '#e5e7eb',      // grey-200 border
    accent: '#ef4444',      // red-500
    accentGradient: 'from-red-500 to-orange-500',
    text: '#0f172a',        // slate-900
    textMuted: '#64748b',   // slate-500
    ring: '#ffffff',        // ring around avatar/logo
    ringSilver: '#c0c0c0',  // classic silver stroke for profile/logo in light mode
    buttonBg: '#0f172a',    // dark CTA
    buttonText: '#ffffff',
    // Public page background
    pageBg: '#ffffff',
  },

  // ─── Night (dark background) ───────────────────────────────
  night: {
    bgStyle: 'solid',
    bg: '#0a0a0a',
    surface: '#18181b',     // zinc-900
    border: '#27272a',      // zinc-800
    accent: '#fb923c',      // orange-400 (brighter on dark)
    accentGradient: 'from-red-500 to-orange-500',
    text: '#fafafa',
    textMuted: '#a1a1aa',   // zinc-400
    ring: '#000000',
    ringSilver: '#71717a',  // zinc-500 silver (kept for parity; not used in dark mode)
    buttonBg: '#ffffff',
    buttonText: '#0f172a',
    pageBg: '#0a0a0a',
  },
}

export function getTheme(nightMode) {
  return nightMode ? THEMES.night : THEMES.day
}

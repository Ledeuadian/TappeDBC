import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Card context — Supabase-backed persistence for business cards.
 * Cards table columns mirror the fields edited in CardEditorPage.
 */
const CardContext = createContext(null)

/** Fields of the cards table that the editor may write. */
const CARD_FIELDS = [
  'name', 'title', 'company', 'pronouns', 'email', 'phone', 'website', 'brand_title',
  'address', 'bio', 'headline', 'accreditations',
  'theme_color', 'accent_color', 'bg_style',
  'avatar_url', 'cover_url', 'logo_url', 'night_mode',
  'avatar_url_pos', 'cover_url_pos', 'logo_url_pos',
  'is_published', 'slug', 'links', 'layout', 'handle',
]

/** Pick only known fields so we never send stray form keys to the DB. */
function pickCardFields(data) {
  const out = {}
  for (const k of CARD_FIELDS) {
    if (data && k in data && data[k] !== undefined) out[k] = data[k]
  }
  return out
}

/** Cryptographically-strong URL-safe random suffix. */
function randomSuffix(len = 6) {
  const bytes = new Uint8Array(len)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

/** Generate a URL-safe slug from a name, with a CSPRNG suffix for uniqueness. */
function slugify(name) {
  const base = (name || 'card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'card'}-${randomSuffix(6)}`
}

export function CardProvider({ children }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  // Initial load of the signed-in user's cards; reload on auth changes
  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCards([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) console.error('[tappe] load cards error', error)
      if (mounted) {
        setCards(data || [])
        setLoading(false)
      }
    }

    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    setCards(data || [])
    return data || []
  }, [])

  const createCard = async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('You must be signed in to create a card')

    const fields = pickCardFields(data)
    const insert = { ...fields, owner_id: user.id, slug: slugify(fields.name) }

    // Retry once with a fresh slug on a unique-constraint conflict
    let result, error
    ;({ data: result, error } = await supabase.from('cards').insert(insert).select().single())
    if (error && error.code === '23505') {
      insert.slug = slugify(fields.name)
      ;({ data: result, error } = await supabase.from('cards').insert(insert).select().single())
    }
    if (error) throw error

    setCards((prev) => [result, ...prev])
    return result
  }

  const updateCard = async (cardId, data) => {
    // Hard guard — never let an undefined / empty id reach Supabase.
    if (!cardId || cardId === 'undefined' || cardId === 'null') {
      throw new Error(`updateCard called with invalid cardId: ${JSON.stringify(cardId)}`)
    }
    const fields = pickCardFields(data)
    const { data: result, error } = await supabase
      .from('cards')
      .update(fields)
      .eq('id', cardId)
      .select()
      .maybeSingle() // 0 rows → null instead of PGRST116 (e.g. RLS-hidden row)
    if (error) throw error

    if (!result) {
      console.warn(`[tappe] updateCard matched 0 rows for id=${cardId} (RLS or missing row)`)
      return null
    }

    setCards((prev) => prev.map((c) => (c.id === cardId ? result : c)))
    return result
  }

  const deleteCard = async (cardId) => {
    const { error } = await supabase.from('cards').delete().eq('id', cardId)
    if (error) throw error
    setCards((prev) => prev.filter((c) => c.id !== cardId))
  }

  const getCard = (cardId) => cards.find((c) => c.id === cardId)

  /** Public lookup by slug — falls back to a direct query if not in state. */
  const getCardBySlug = async (slug) => {
    const cached = cards.find((c) => c.slug === slug)
    if (cached) return cached
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return (
    <CardContext.Provider
      value={{ cards, loading, refresh, createCard, updateCard, deleteCard, getCard, getCardBySlug }}
    >
      {children}
    </CardContext.Provider>
  )
}

export function useCards() {
  const ctx = useContext(CardContext)
  if (!ctx) throw new Error('useCards must be used within CardProvider')
  return ctx
}

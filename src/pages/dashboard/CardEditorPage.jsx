import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  PencilIcon, UserIcon, PlusIcon, ChevronDownIcon,
} from 'lucide-react'

/**
 * Brand logo — PNG from public/logos. Used for brands that have no icon
 * in lucide-react v1.42 (Facebook, Instagram, X, YouTube, TikTok, GCash,
 * Messenger, etc.). Falls back to a colored letter glyph if the image
 * fails to load.
 */
function BrandLogo({ src, alt, glyph, color, className = 'h-3.5 w-3.5' }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="text-xs font-extrabold leading-none" style={{ color }}>
        {glyph}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt || ''}
      onError={() => setFailed(true)}
      className={className}
      draggable={false}
    />
  )
}
import { useCards } from '../../context/CardContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { uploadCardAsset } from '../../lib/storage.js'
import { getTheme } from '../../themes.js'
import { ICON_CATEGORIES, CARD_LINK_ICONS as ALL_ICONS, linkValue } from '../../lib/cardIcons.js'

/**
 * Plain, sophisticated editor — Personal Info only (for now).
 * Just text fields with placeholders. No labels, no legends, no accordions.
 */
export default function CardEditorPage() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const isNew = cardId === 'new'
  const { getCard, getCardBySlug, createCard, updateCard, loading } = useCards()
  const { user } = useAuth()
  const card = isNew ? null : getCard(cardId)
  // Authoritative id — for existing cards, prefer URL param. For new cards
  // we don't have one until the first Save.
  const effectiveId = isNew ? null : (cardId || card?.id)
  const [form, setForm] = useState(card || {})
  const [uploading, setUploading] = useState({ cover: false, avatar: false, logo: false })
  // Per-slot drag state — keeps the "live" drag positions separate from
  // the saved `*_pos` until the user confirms.
  const [draftPos, setDraftPos] = useState({
    cover_url_pos: null,
    avatar_url_pos: null,
    logo_url_pos: null,
  })
  // { field, src, baseX, baseY, x, y, scale } — null when not dragging
  const dragRef = useRef(null)
  // Hidden file inputs — the whole frame click opens them programmatically
  const fileInputRefs = {
    cover_url: useRef(null),
    logo_url: useRef(null),
    avatar_url: useRef(null),
  }
  // Timestamp of the last completed drag — suppresses the click that follows
  // a drag-release so repositioning never opens the file picker
  const lastDragEndRef = useRef(0)

  /** Open the file picker for a frame — unless we just finished dragging. */
  const openPicker = (field) => () => {
    if (Date.now() - lastDragEndRef.current < 300) return
    fileInputRefs[field]?.current?.click()
  }
  // Confirmation popup after drag releases
  const [pendingSave, setPendingSave] = useState(null)
  // Track unsaved changes + save status
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  // Becomes true after the first explicit Save — prevents Cancel from
  // deleting an existing card that was just opened for editing.
  const savedOnceRef = useRef(false)
  // Sticky bottom Preview Card — hidden until the user scrolls past ~280px
  const [showStickyPreview, setShowStickyPreview] = useState(false)
  // Collapsible "more content" section — expands the page with extra fields
  const [expanded, setExpanded] = useState(false)
  // Inline editing of the card name in the top-center nav title
  const [editingName, setEditingName] = useState(false)

  const toggleExpanded = () => {
    setExpanded((v) => !v)
  }

  // ----- Form validation for the additional-content popup -----
  // Mirrors the per-add-on rules requested:
  //   phone.mobile   → +63 prefix + 10 digits (e.g. +639171234567)
  //   phone.landline → must include a zone/area code (e.g. (02), (032), +632)
  //   email / biz_email → valid email format
  //   every other "value" URL field → valid http(s) URL (empty is allowed)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  // Philippine mobile: +63 + exactly 10 digits (no spaces)
  const PH_MOBILE_REGEX = /^\+63\d{10}$/
  // Philippine landline: must include a zone code. Accepts:
  //   (0X) ... or 0X ... where X is 1–2 digit area code, e.g. (02) 1234-5678, 02-1234-5678,
  //   (0XX) ..., or international +63X ... (e.g. +632 1234 5678).
  const PH_LANDLINE_ZONE_REGEX = /\((\d{1,4})\)|(\b|^)0\d{1,3}[-\s]?|\+?63\d{1,2}/

  function validateFieldValue(iconKey, key, rawValue) {
    const value = (rawValue ?? '').trim()
    if (!value) return '' // empty is fine — user can leave optional fields blank
    if ((iconKey === 'phone' || iconKey === 'biz_phone') && key === 'mobile') {
      if (!PH_MOBILE_REGEX.test(value)) {
        return 'Use +63 followed by 10 digits, e.g. +639171234567.'
      }
      return ''
    }
    if ((iconKey === 'phone' || iconKey === 'biz_phone') && key === 'landline') {
      if (!PH_LANDLINE_ZONE_REGEX.test(value)) {
        return 'Landline must include a zone/area code, e.g. (02) 1234-5678.'
      }
      return ''
    }
    if (iconKey === 'email' || iconKey === 'biz_email') {
      if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.'
      return ''
    }
    // Default URL field — accept values without protocol by prefixing http://
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`
    try {
      const u = new URL(withProto)
      if (!u.hostname.includes('.')) return 'Please enter a valid link (e.g. https://example.com).'
      return ''
    } catch {
      return 'Please enter a valid link (e.g. https://example.com).'
    }
  }

  function validateLinkValues(iconKey, values) {
    const form = LINK_FORMS[iconKey]
    const fields = form?.fields || [{ key: 'value' }]
    const errors = {}
    for (const f of fields) {
      const msg = validateFieldValue(iconKey, f.key, values?.[f.key] || '')
      if (msg) errors[f.key] = msg
    }
    return errors
  }

  // Per-icon popup form shape. Icons not listed get the default single
  // value/URL field. `qr: true` icons (payments) get a QR-code upload
  // instead of a text field.
  const LINK_FORMS = {
    phone: {
      title: 'Phone',
      fields: [
        { key: 'mobile', label: 'Mobile / Cellular', type: 'tel', placeholder: '+63 9XX XXX XXXX' },
        { key: 'landline', label: 'Landline', type: 'tel', placeholder: '(02) XXXX XXXX' },
      ],
    },
    biz_phone: {
      title: 'Phone',
      fields: [
        { key: 'mobile', label: 'Mobile / Cellular', type: 'tel', placeholder: '+63 9XX XXX XXXX' },
        { key: 'landline', label: 'Landline', type: 'tel', placeholder: '(02) XXXX XXXX' },
      ],
    },
    gcash: { title: 'GCash', qr: true, qrHint: 'Upload your GCash QR code' },
    paymaya: { title: 'Maya', qr: true, qrHint: 'Upload your Maya QR code' },
  }

  /** Validate the full `form.links` array against the DB trigger's rules so
   *  the user gets a clear error instead of a cryptic 400 P0001 from
   *  Postgres. Returns `{ ok: true }` or `{ ok: false, message }`. */
  function validateAllLinks(links) {
    if (!Array.isArray(links) || links.length === 0) return { ok: true }
    const URL_RE = /^https?:\/\//
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (let i = 0; i < links.length; i++) {
      const entry = links[i]
      const label = entry?.label || entry?.icon || `Link ${i + 1}`
      const v = entry?.values || {}
      // text "value" URL/email field — matches tg_validate_card_links
      if (typeof v.value === 'string' && v.value.trim()) {
        const t = v.value.trim()
        if (!URL_RE.test(t) && !EMAIL_RE.test(t)) {
          return { ok: false, message: `"${label}" value must be a valid URL (https://…) or email.` }
        }
      }
      // qr_url must be a https URL — already enforced by uploadCardAsset,
      // but cover the case of a manual paste
      if (typeof v.qr_url === 'string' && v.qr_url.trim()) {
        if (!URL_RE.test(v.qr_url.trim())) {
          return { ok: false, message: `"${label}" QR code URL is invalid.` }
        }
      }
    }
    return { ok: true }
  }

  const linkFormFor = (iconKey) =>
    LINK_FORMS[iconKey] || {
      title: ALL_ICONS[iconKey]?.label || iconKey,
      fields: [
        {
          key: 'value',
          label: ALL_ICONS[iconKey]?.label || 'Value',
          type: 'url',
          placeholder: ALL_ICONS[iconKey]?.label
            ? `Enter your ${ALL_ICONS[iconKey].label} link`
            : 'Enter value',
        },
      ],
    }

  // Popup fill-up form state: { categoryId, iconKey, editingIdx, values, qrFile, qrPreview, qrExisting, errors }
  const [linkModal, setLinkModal] = useState(null)
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkErrors, setLinkErrors] = useState({})

  /** Open the popup for a fresh entry (icon tap) or an existing row (row tap). */
  const openLinkModal = (categoryId, iconKey, editingIdx = null) => {
    const existing = editingIdx != null ? (form.links || [])[editingIdx] : null
    setLinkModal({
      categoryId,
      iconKey,
      editingIdx,
      values: { ...(existing?.values || {}) },
      qrFile: null,
      qrPreview: existing?.values?.qr_url || null,
      qrExisting: !!existing?.values?.qr_url,
    })
  }

  const closeLinkModal = () => {
    setLinkModal(null)
    setLinkErrors({})
  }

  /** Save the popup: uploads a pending QR file if there is one, then
   *  adds/updates the corresponding entry in form.links. */
  const saveLinkModal = async () => {
    if (!linkModal) return
    const { categoryId, iconKey, editingIdx, values, qrFile } = linkModal
    const label = ALL_ICONS[iconKey]?.label || iconKey

    // Validate first — block save on any errors and surface them per-field.
    const errors = validateLinkValues(iconKey, values)
    if (Object.keys(errors).length > 0) {
      setLinkErrors(errors)
      setLinkSaving(false)
      return
    }
    setLinkErrors({})

    setLinkSaving(true)
    try {
      let nextValues = { ...values }

      // QR upload path — needs an owner + (ideally) a saved card row
      if (qrFile) {
        if (!user?.id) throw new Error('You must be signed in to upload a QR code.')
        let id = effectiveId
        if (!id || id === 'undefined' || id === 'null') {
          // Brand-new card — create the row first so storage path is stable
          const created = await createCard(form)
          if (created?.id) {
            id = created.id
            savedOnceRef.current = true
            window.history.replaceState(null, '', `/dashboard/cards/${created.id}`)
          }
        }
        const { url } = await uploadCardAsset({ file: qrFile, ownerId: user.id })
        nextValues.qr_url = url
      }

      const entry = { category: categoryId, icon: iconKey, label, values: nextValues }
      setForm((f) => {
        const links = [...(f.links || [])]
        if (editingIdx != null) links[editingIdx] = entry
        else links.push(entry)
        return { ...f, links }
      })
      setDirty(true)
      setLinkModal(null)
    } catch (err) {
      console.error('[tappe] save link failed:', err)
      alert('Could not save: ' + err.message)
    } finally {
      setLinkSaving(false)
    }
  }

  /** Re-validate a single field as the user edits — clears its error if it
   *  becomes valid, otherwise keeps/updates the message. */
  const handleLinkFieldChange = (iconKey, key, value) => {
    setLinkModal((m) => ({
      ...m,
      values: { ...m.values, [key]: value },
    }))
    const msg = validateFieldValue(iconKey, key, value)
    setLinkErrors((prev) => {
      const next = { ...prev }
      if (msg) next[key] = msg
      else delete next[key]
      return next
    })
  }

  // Add/update/remove are handled by the popup modal + the row Remove
  // button below. Only `removeLink` stays here for inline deletion.
  const removeLink = (idx) => {
    setForm((f) => {
      const next = [...(f.links || [])]
      next.splice(idx, 1)
      return { ...f, links: next }
    })
    setDirty(true)
  }

  useEffect(() => {
    const onScroll = () => setShowStickyPreview(window.scrollY > 280)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Ref mirror of draftPos so endDrag can read it synchronously
  const draftRef = useRef(draftPos)
  useEffect(() => { draftRef.current = draftPos }, [draftPos])

  // Once the card finishes loading from Supabase, sync the form to it
  // (skip for /new — there's no card yet)
  useEffect(() => {
    if (!isNew && card && !form.id) setForm(card)
  }, [card, form.id, isNew])

  // Local-only update — persists ONLY when Save is clicked
  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  // Cancel — for a brand-new unsaved card there is nothing to delete (the
  // row was never created); for an existing card nothing is touched.
  const handleCancel = () => {
    navigate('/dashboard', { replace: true })
  }

  // Save button — creates the card on first save, updates afterwards
  const handleSave = async () => {
    // Client-side link validation — mirrors tg_validate_card_links so we
    // fail fast with a clear message instead of a 400 from the DB trigger.
    const linkCheck = validateAllLinks(form.links)
    if (!linkCheck.ok) {
      alert('Cannot save: ' + linkCheck.message)
      return
    }
    setSaving(true)
    try {
      if (isNew && !savedOnceRef.current) {
        // First save on a brand-new card — CREATE the row now
        const created = await createCard(form)
        if (created?.id) {
          savedOnceRef.current = true
          // Replace the URL so a refresh keeps working — no page reload
          window.history.replaceState(null, '', `/dashboard/cards/${created.id}`)
        }
      } else if (effectiveId && effectiveId !== 'undefined' && effectiveId !== 'null') {
        await updateCard(effectiveId, form)
        savedOnceRef.current = true
      }
      setDirty(false)
    } catch (err) {
      console.error('[tappe] save failed:', err)
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Card is missing entirely (and not the "new" editor) — bounce back
  if (!loading && !effectiveId && !isNew) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const openPreview = async () => {
    // Preview is READ-ONLY — it never creates or saves a card. The current
    // form state is passed via router state so the public page can render
    // an ephemeral preview (works for both saved and unsaved cards).
    navigate(`/c/preview`, { state: { draft: form } })
  }

  /** Upload an image to Supabase Storage, then persist its public URL on the card. */
  const handleImageUpload = async (e, field, key) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!user?.id) {
      alert('You must be signed in to upload images.')
      e.target.value = ''
      return
    }

    // Show a local preview immediately for snappy UX
    const localUrl = URL.createObjectURL(file)
    setForm((f) => ({ ...f, [field]: localUrl }))
    setUploading((u) => ({ ...u, [key]: true }))

    // If this is a brand-new card, create the row first so we have an id
    let id = effectiveId
    if (!id || id === 'undefined' || id === 'null') {
      try {
        const created = await createCard(form)
        if (created?.id) {
          id = created.id
          savedOnceRef.current = true
          window.history.replaceState(null, '', `/dashboard/cards/${created.id}`)
        }
      } catch (err) {
        console.error('[tappe] create before upload failed:', err)
        alert('Could not save card before upload: ' + err.message)
        setUploading((u) => ({ ...u, [key]: false }))
        e.target.value = ''
        return
      }
    }

    try {
      const { url } = await uploadCardAsset({ file, ownerId: user.id })
      setForm((f) => ({ ...f, [field]: url }))
      await updateCard(id, { [field]: url })
    } catch (err) {
      console.error(`[tappe] upload ${field} failed:`, err)
      alert(`Upload failed: ${err.message}`)
      setForm((f) => {
        const next = { ...f }
        if (next[field] === localUrl) delete next[field]
        return next
      })
    } finally {
      setUploading((u) => ({ ...u, [key]: false }))
      e.target.value = ''
    }
  }

  /** Save a chosen crop: persist to the matching `_<field>_pos` column on the card. */
  const handleCropSave = async (crop) => {
    if (!pendingSave) return
    if (!effectiveId || effectiveId === 'undefined' || effectiveId === 'null') {
      console.error('[tappe] crop save aborted — no card id', { effectiveId, pendingSave })
      setPendingSave(null)
      return
    }
    const posField = `${pendingSave.field}_pos`
    setForm((f) => ({ ...f, [posField]: crop }))
    setDraftPos((d) => ({ ...d, [posField]: null })) // clear local draft
    try {
      await updateCard(effectiveId, { [posField]: crop })
    } catch (err) {
      console.error('[tappe] save crop failed:', err)
    }
    setPendingSave(null)
  }

  const handleCropCancel = () => {
    if (!pendingSave) return
    const posField = `${pendingSave.field}_pos`
    // Drop the draft — image snaps back to the saved pos
    setDraftPos((d) => ({ ...d, [posField]: null }))
    setPendingSave(null)
  }

  /** Inline drag — start on pointerdown over the image, update draft, end on pointerup. */
  const startDrag = (e, field, src) => {
    if (!src || !effectiveId) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const saved = form[`${field}_pos`] || { x: 50, y: 50, scale: 1 }
    dragRef.current = {
      field,
      rect,
      startX: e.clientX,
      startY: e.clientY,
      baseX: saved.x,
      baseY: saved.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const moveDrag = (e) => {
    const d = dragRef.current
    if (!d) return
    const dx = ((e.clientX - d.startX) / d.rect.width) * 100
    const dy = ((e.clientY - d.startY) / d.rect.height) * 100
    if (!d.moved && (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5)) d.moved = true
    const posField = `${d.field}_pos`
    setDraftPos((p) => ({
      ...p,
      [posField]: {
        x: clamp(d.baseX - dx, 0, 100),
        y: clamp(d.baseY - dy, 0, 100),
        scale: (p[posField] || form[posField] || { scale: 1 }).scale || 1,
      },
    }))
  }

  const endDrag = (e) => {
    const d = dragRef.current
    if (!d) return
    e.currentTarget?.releasePointerCapture?.(e.pointerId)
    if (d.moved) lastDragEndRef.current = Date.now()
    dragRef.current = null
    if (!d.moved || !effectiveId) return // it was a click, or card isn't ready yet
    const posField = `${d.field}_pos`
    const draft = draftRef.current?.[posField] || form[posField] || { x: 50, y: 50, scale: 1 }
    setPendingSave({ field: d.field, src: form[d.field], crop: draft })
  }

  /** Build the inline style for an image preview — draft overrides saved. */
  const cropStyle = (field) => {
    const saved = form[`${field}_pos`]
    const draft = draftPos[`${field}_pos`]
    const pos = draft || saved
    if (!pos) return undefined
    return {
      objectPosition: `${pos.x}% ${pos.y}%`,
      transform: `scale(${pos.scale || 1})`,
      transformOrigin: 'center',
      transition: dragRef.current ? 'none' : 'transform 0.2s ease',
    }
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  // Resolve the active theme based on the card's persisted night_mode flag.
  // Re-runs every render so the toggle updates immediately.
  const theme = getTheme(form.night_mode)
  // Input field outline. Light mode uses silver to make text fields noticeable;
  // night mode keeps the standard dark border.
  const fieldBorder = `1px solid ${theme.border}`

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ background: theme.bg }}
    >
      {/* Nav bar: Cancel / Tappe / Save */}
      <header className="flex items-center justify-between px-5 py-4">
        <button
          onClick={handleCancel}
          className="text-sm"
          style={{ color: theme.textMuted }}
        >
          Cancel
        </button>
        <div className="flex items-center gap-1.5">
          {editingName ? (
            <input
              autoFocus
              value={form.brand_title || ''}
              onChange={(e) => {
                setForm((f) => ({ ...f, brand_title: e.target.value }))
                setDirty(true)
              }}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingName(false)
              }}
              placeholder="Card name"
              className="font-bold text-center outline-none rounded px-2 py-0.5 w-44"
              style={{
                color: theme.text,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 active:scale-95 transition"
              aria-label="Edit card name"
            >
              <span className="font-bold" style={{ color: theme.text }}>
                {form.brand_title || 'Tappe'}
              </span>
              <PencilIcon className="h-3.5 w-3.5" style={{ color: theme.textMuted }} />
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || (!dirty && !isNew)}
          className="text-sm font-semibold disabled:opacity-50"
          style={{ color: theme.accent }}
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </header>

      {/* Personal Info fields — placeholders only, no labels */}
      <main className="flex-1 px-6 pt-6 pb-32 space-y-5">
        {/* Profile picture + cover photo + logo — like Facebook's header */}
        <div className="relative">
          {/* Cover photo — drag to reposition, Replace chip, no modal */}
          <div
            className="block h-32 w-full overflow-hidden relative cursor-pointer"
            onClick={form.cover_url ? openPicker('cover_url') : undefined}
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
          >
            {/* Shared hidden input — opened by any click on the frame */}
            <input
              ref={fileInputRefs.cover_url}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, 'cover_url', 'cover')}
            />
            {form.cover_url ? (
              <img
                src={form.cover_url}
                alt="Cover"
                draggable={false}
                onPointerDown={(e) => startDrag(e, 'cover_url', form.cover_url)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="h-full w-full object-cover cursor-grab active:cursor-grabbing touch-none"
                style={cropStyle('cover_url')}
              />
            ) : (
              <div
                className="h-full w-full grid place-items-center text-sm cursor-pointer transition"
                style={{ color: theme.textMuted }}
              >
                Add cover photo
              </div>
            )}
            {form.cover_url && (
              <span
                className="absolute top-2 left-2 rounded-full text-[10px] px-2 py-1 pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
              >
                ↻
              </span>
            )}
          </div>

          {/* Logo — drag to reposition, Replace chip */}
          {form.logo_url ? (
            <div
              className="absolute -bottom-6 right-5 h-12 w-12 rounded-xl overflow-hidden z-30 cursor-pointer"
              onClick={openPicker('logo_url')}
              style={{
                background: theme.surface,
                border: `2px solid ${theme.border}`,
              }}
            >
              <input
                ref={fileInputRefs.logo_url}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'logo_url', 'logo')}
              />
              <img
                src={form.logo_url}
                alt="Logo"
                draggable={false}
                onPointerDown={(e) => startDrag(e, 'logo_url', form.logo_url)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="h-full w-full object-cover cursor-grab active:cursor-grabbing touch-none"
                style={cropStyle('logo_url')}
              />
              {/* Replace hint chip */}
              <span
                className="absolute top-1 left-1 rounded-full text-[10px] px-2 py-1 pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
              >
                ↻
              </span>
            </div>
          ) : (
            <label
              className="absolute -bottom-6 right-5 h-12 w-12 rounded-xl grid place-items-center cursor-pointer transition z-30"
              style={{
                background: theme.surface,
                color: theme.textMuted,
                border: `2px solid ${theme.border}`,
              }}
            >
              <PlusIcon className="h-5 w-5" strokeWidth={1.5} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'logo_url', 'logo')}
              />
            </label>
          )}

          {/* Profile picture — drag to reposition, Replace chip, themed ring */}
          {form.avatar_url ? (
            <div
              className="absolute -bottom-12 left-5 h-28 w-28 rounded-full overflow-hidden z-20 cursor-pointer"
              onClick={openPicker('avatar_url')}
              style={{
                background: theme.surface,
                border: `2px solid ${theme.border}`,
              }}
            >
              <input
                ref={fileInputRefs.avatar_url}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'avatar_url', 'avatar')}
              />
              <img
                src={form.avatar_url}
                alt="Profile"
                draggable={false}
                onPointerDown={(e) => startDrag(e, 'avatar_url', form.avatar_url)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="h-full w-full object-cover cursor-grab active:cursor-grabbing touch-none"
                style={cropStyle('avatar_url')}
              />
              {/* Replace hint chip */}
              <span
                className="absolute top-1 left-1 rounded-full text-[10px] px-2 py-1 pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
              >
                ↻
              </span>
            </div>
          ) : (
            <label
              className="absolute -bottom-12 left-5 h-28 w-28 rounded-full grid place-items-center cursor-pointer transition z-20"
              style={{
                background: theme.surface,
                border: `2px solid ${theme.border}`,
              }}
            >
              <UserIcon className="h-16 w-16" style={{ color: theme.accent }} strokeWidth={1} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'avatar_url', 'avatar')}
              />
            </label>
          )}
        </div>

        {/* Push everything else below the profile-photo overlap */}
        <div className="pt-10">
          <button
            type="button"
            onClick={() => {/* TODO: open layout picker */}}
            className="block mx-auto w-full px-4 py-4 text-sm font-medium transition"
            style={{
              background: theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          >
            Change Layout
          </button>
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Personal Info</h1>
            <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>Share a few details about you</p>
          </div>
        </div>
        <input
          value={form.name || ''}
          onChange={set('name')}
          placeholder="Name"
          className="w-full px-4 py-2 text-lg font-normal outline-none transition-colors"
          style={{ background: theme.surface, color: theme.text, border: fieldBorder }}
        />
        <input
          value={form.title || ''}
          onChange={set('title')}
          placeholder="Job title"
          className="w-full px-4 py-2 text-base font-normal outline-none"
          style={{ background: theme.surface, color: theme.text, border: fieldBorder }}
        />
        <input
          value={form.company || ''}
          onChange={set('company')}
          placeholder="Company"
          className="w-full px-4 py-2 text-base font-normal outline-none"
          style={{ background: theme.surface, color: theme.text, border: fieldBorder }}
        />
        <input
          value={form.address || ''}
          onChange={set('address')}
          placeholder="Home Address"
          className="w-full px-4 py-2 text-base font-normal outline-none"
          style={{ background: theme.surface, color: theme.text, border: fieldBorder }}
        />
        <input
          value={form.pronouns || ''}
          onChange={set('pronouns')}
          placeholder="Pronouns"
          className="w-full px-4 py-2 text-base font-normal outline-none"
          style={{ background: theme.surface, color: theme.text, border: fieldBorder }}
        />
        <input
          value={form.headline || ''}
          onChange={set('headline')}
          placeholder="Headline"
          className="w-full px-4 py-2 text-base font-normal outline-none"
          style={{ background: theme.surface, color: theme.text, border: fieldBorder }}
        />
        {/* Accreditations — multiple fields, persisted comma-separated */}
        <div className="w-full space-y-2">
          {(form.accreditations || '').split(',').map((acc, idx, arr) => (
            <div key={idx} className="relative">
              <input
                value={acc}
                onChange={(e) => {
                  // A space would never survive the trim below — but it's
                  // the only reason to type one, so strip it from the
                  // "collapse trailing empty field" cleanup only.
                  const items = (form.accreditations || '').split(',')
                  items[idx] = e.target.value
                  // Don't persist a trailing comma when the user hasn't typed
                  // in the extra field yet
                  const joined = items.join(',').replace(/,\s*$/, '')
                  setForm((f) => ({ ...f, accreditations: joined }))
                  setDirty(true)
                }}
                placeholder={idx === 0 ? 'Accreditations' : 'Add accreditation'}
                className="w-full px-4 py-2 text-base font-normal outline-none"
                style={{
                  background: theme.surface,
                  color: theme.text,
                  border: fieldBorder,
                  // Reserve space on the right for the inline ✕ button
                  paddingRight: idx > 0 || arr.length > 1 ? '2.5rem' : undefined,
                }}
              />
              {/* Inline remove button — only on rows past the first, or the
                  first when there are multiple rows */}
              {(idx > 0 || arr.length > 1) && (
                <button
                  type="button"
                  aria-label="Remove accreditation"
                  onClick={() => {
                    const items = (form.accreditations || '').split(',')
                    items.splice(idx, 1)
                    setForm((f) => ({ ...f, accreditations: items.join(',') }))
                    setDirty(true)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full active:scale-95 transition"
                  style={{ color: theme.textMuted }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {/* + button to add another accreditation field */}
          <button
            type="button"
            onClick={() => {
              // Append an empty entry — joined with a comma so the next
              // input renders as its own field
              const current = form.accreditations || ''
              setForm((f) => ({ ...f, accreditations: current ? `${current},` : ',' }))
              setDirty(true)
            }}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium rounded-lg active:scale-[0.98] transition"
            style={{ color: theme.textMuted, border: `1px dashed ${theme.border}` }}
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2} />
            Add accreditation
          </button>
        </div>

        {/* Light / Night mode toggle — outer pill flips with the selected mode */}
        <div
          className="mx-auto rounded-full p-1 flex w-fit transition-colors"
          style={{
            background: form.night_mode ? '#ffffff' : '#0f172a',
            border: `1px solid ${form.night_mode ? '#e5e7eb' : '#1e293b'}`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({ ...f, night_mode: false }))
              setDirty(true)
            }}
            className="flex-1 rounded-full px-4 py-1.5 text-xs font-medium transition"
            style={{
              background: !form.night_mode ? theme.accent : 'transparent',
              color: !form.night_mode ? '#ffffff' : '#cbd5e1',
            }}
          >
            Light Mode
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({ ...f, night_mode: true }))
              setDirty(true)
            }}
            className="flex-1 rounded-full px-4 py-1.5 text-xs font-medium transition"
            style={{
              background: form.night_mode ? theme.accent : 'transparent',
              color: form.night_mode ? '#ffffff' : '#cbd5e1',
            }}
          >
            Night Mode
          </button>
        </div>

        {/* Saved additional content — always visible below the mode toggle.
            Tap a chip to re-open its fill-up form. */}
        {(form.links || []).length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {form.links.map((link, idx) => {
              const meta = ALL_ICONS[link.icon] || {}
              const Icon = meta.Icon
              const summary = link.values?.qr_url
                ? 'QR code'
                : [link.values?.mobile, link.values?.landline, link.values?.value]
                    .filter(Boolean)
                    .join(' · ')
              return (
                <div key={idx} className="relative">
                  <button
                    type="button"
                    onClick={() => openLinkModal(link.category, link.icon, idx)}
                    title={`${meta.label || link.label}${summary ? ': ' + summary : ''}`}
                    className="flex items-center justify-center rounded-2xl transition active:scale-90"
                  >
                    {meta.logo ? (
                      <BrandLogo
                        src={meta.logo}
                        alt={meta.label}
                        glyph={meta.glyph}
                        color={meta.color || theme.accent}
                        className="h-12 w-12 object-contain p-1"
                      />
                    ) : Icon ? (
                      <Icon className="h-8 w-8 m-2" style={{ color: theme.accent }} />
                    ) : null}
                  </button>
                  {/* Small × overlay to remove the entry */}
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    aria-label={`Remove ${meta.label || link.label}`}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full grid place-items-center text-[10px] font-bold leading-none"
                    style={{
                      background: theme.textMuted,
                      color: theme.pageBg,
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}

          {/* Tap to add more content — collapsible section */}
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          className="block mx-auto text-sm font-medium underline underline-offset-4 decoration-2 transition-opacity hover:opacity-70 active:scale-[0.98]"
          style={{ color: form.night_mode ? '#ffffff' : '#0f172a' }}
        >
          {expanded ? 'Hide additional content' : 'Tap to add more content'}
        </button>

        {/* Expandable icon picker + link rows — grid animates height */}
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-in-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="pt-5 space-y-6">
              {ICON_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <p
                    className="text-xs font-semibold tracking-normal mb-2"
                    style={{ color: theme.textMuted }}
                  >
                    {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {cat.icons.map(({ key, label, Icon, logo, glyph, color }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openLinkModal(cat.id, key)}
                        title={label}
                        aria-label={label}
                        tabIndex={expanded ? 0 : -1}
                        className="flex items-center justify-center rounded-2xl transition active:scale-90"
                      >
                        {logo ? (
                          <BrandLogo
                            src={logo}
                            alt={label}
                            glyph={glyph}
                            color={color || theme.accent}
                            className="h-14 w-14 object-contain p-1.5"
                          />
                        ) : Icon ? (
                          <Icon className="h-10 w-10 m-2" style={{ color: theme.accent }} />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
      </main>

      {/* Sticky bottom Preview Card button — appears after scrolling past the top */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 flex justify-center"
        style={{
          transform: showStickyPreview ? 'translateY(0)' : 'translateY(120%)',
          pointerEvents: showStickyPreview ? 'auto' : 'none',
        }}
      >
        <div
          className="w-full max-w-sm px-4 py-4"
          style={{
            background: theme.pageBg,
            borderTop: `1px solid ${theme.border}`,
          }}
        >
          <button
            onClick={openPreview}
            disabled={!form.name?.trim()}
            className="mx-auto w-full max-w-sm rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-base font-bold py-3 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            Preview Card
          </button>
        </div>
      </div>

      {/* Drag-end confirmation popup — sits above the sticky bar */}
      {pendingSave && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-6">
          <div
            className="w-full max-w-sm rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl"
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: theme.text }}>Save position?</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>Your crop will be applied to the card preview.</p>
            </div>
            <button
              type="button"
              onClick={handleCropCancel}
              className="rounded-full px-4 py-1.5 text-sm font-medium"
              style={{ color: theme.textMuted }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleCropSave(pendingSave.crop)}
              className="rounded-full px-4 py-1.5 text-sm font-bold text-white hover:brightness-110 active:scale-[0.97] transition"
              style={{ background: theme.accent }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Per-icon fill-up modal — opens on icon tap or row tap */}
      {linkModal && (
        <LinkFillUpModal
          form={linkFormFor(linkModal.iconKey)}
          meta={ALL_ICONS[linkModal.iconKey] || {}}
          linkModal={linkModal}
          setLinkModal={setLinkModal}
          theme={theme}
          saving={linkSaving}
          errors={linkErrors}
          onCancel={closeLinkModal}
          onSave={saveLinkModal}
          onFieldChange={handleLinkFieldChange}
        />
      )}
    </div>
  )
}

/**
 * Fill-up popup shown when the user taps an icon in the additional-content
 * picker or an existing link row. Renders the icon-specific form fields
 * defined in `LINK_FORMS` (or a default URL field for unconfigured icons),
 * plus a QR-code upload for payment icons (gcash, maya).
 */
function LinkFillUpModal({ form, meta, linkModal, setLinkModal, theme, saving, errors, onCancel, onSave, onFieldChange }) {
  const Icon = meta.Icon
  const { fields = [], qr, qrHint } = form

  const onQrSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setLinkModal((m) => ({
      ...m,
      qrFile: file,
      qrPreview: localUrl,
      qrExisting: false,
    }))
    e.target.value = ''
  }

  const clearQr = () => {
    setLinkModal((m) => {
      const next = { ...m }
      delete next.values.qr_url
      return { ...next, qrFile: null, qrPreview: null, qrExisting: false }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60"
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full grid place-items-center shrink-0"
            style={{ background: theme.bg }}
          >
            {meta.logo ? (
              <BrandLogo
                src={meta.logo}
                alt={meta.label}
                glyph={meta.glyph}
                color={meta.color || theme.accent}
                className="h-6 w-6 object-contain"
              />
            ) : Icon ? (
              <Icon className="h-5 w-5" style={{ color: theme.accent }} />
            ) : null}
          </div>
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>{form.title}</h3>
        </div>

        {/* Text/URL fields */}
        <div className="mt-5 space-y-3">
          {fields.map((f) => {
            const err = errors?.[f.key]
            return (
              <div key={f.key}>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: theme.textMuted }}
                >
                  {f.label}
                </label>
                <input
                  type={f.type || 'text'}
                  value={linkModal.values[f.key] || ''}
                  onChange={(e) => onFieldChange(linkModal.iconKey, f.key, e.target.value)}
                  placeholder={f.placeholder || ''}
                  autoComplete="off"
                  aria-invalid={!!err}
                  aria-describedby={err ? `${f.key}-error` : undefined}
                  className="w-full px-3 py-2 text-sm outline-none rounded-lg transition-colors"
                  style={{
                    background: theme.bg,
                    color: theme.text,
                    border: `1px solid ${err ? '#ef4444' : theme.border}`,
                  }}
                />
                {err && (
                  <p
                    id={`${f.key}-error`}
                    className="mt-1 text-xs text-red-500"
                  >
                    {err}
                  </p>
                )}
              </div>
            )
          })}

          {/* QR upload (payments) */}
          {qr && (
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: theme.textMuted }}
              >
                QR Code
              </label>
              {linkModal.qrPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={linkModal.qrPreview}
                    alt="QR preview"
                    className="h-24 w-24 rounded-lg object-contain"
                    style={{ background: '#ffffff', border: `1px solid ${theme.border}` }}
                  />
                  <button
                    type="button"
                    onClick={clearQr}
                    className="text-xs font-medium"
                    style={{ color: theme.textMuted }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  className="flex h-24 w-24 rounded-lg items-center justify-center cursor-pointer text-xs"
                  style={{
                    background: theme.bg,
                    color: theme.textMuted,
                    border: `1px dashed ${theme.border}`,
                  }}
                >
                  <span className="text-center px-2">Upload QR</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onQrSelected}
                  />
                </label>
              )}
              {qrHint && (
                <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>{qrHint}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ color: theme.textMuted }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full px-5 py-2 text-sm font-bold text-white active:scale-[0.97] transition disabled:opacity-50"
            style={{ background: theme.accent }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

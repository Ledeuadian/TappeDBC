import { supabase } from './supabase.js'

// Image-only allowlist. SVG is intentionally excluded — browsers will
// happily execute scripts inside <img src="*.svg"> in some contexts.
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Upload an image to the public `tappe-assets` bucket and return its public URL.
 *
 * Path convention:  <ownerId>/<random>.<ext>
 *   • First segment is the owner UUID — lets the storage RLS policy
 *     (created in supabase/schema.sql) restrict writes to your own folder.
 *   • Random suffix avoids collisions.
 *
 * Returns: { url: string } on success, throws on failure.
 */
export async function uploadCardAsset({ file, ownerId, bucket = 'tappe-assets' }) {
  if (!ownerId) throw new Error('uploadCardAsset: ownerId required')
  if (!file) throw new Error('uploadCardAsset: file required')

  // Client-side allowlist + size cap. Supabase Storage will also enforce
  // its own size limit, but checking here gives a fast, friendly error.
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Image is too large. Maximum size is 5 MB.')
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const typeOk = file.type ? ALLOWED_TYPES.has(file.type) : true
  const extOk = ext ? ALLOWED_EXTS.has(ext) : true
  if (!typeOk && !extOk) {
    throw new Error('Only JPEG, PNG, WebP, or AVIF images are allowed.')
  }

  const random = Math.random().toString(36).slice(2, 10)
  const path = `${ownerId}/${Date.now()}-${random}.${ext || 'jpg'}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export const UPLOAD_LIMITS = {
  maxSizeBytes: MAX_SIZE_BYTES,
  allowedTypes: [...ALLOWED_TYPES],
  allowedExts: [...ALLOWED_EXTS],
}

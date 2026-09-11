import { supabase } from './supabase.js'

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

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const random = Math.random().toString(36).slice(2, 10)
  const path = `${ownerId}/${Date.now()}-${random}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

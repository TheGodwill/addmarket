import 'server-only'
import { createAdminClient } from './supabase/admin'
import { logger } from './logger'

const BUCKET = 'card-photos'
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedMime = (typeof ALLOWED_MIME)[number]

export async function uploadCardPhoto(
  file: File,
  userId: string,
  side: 'front' | 'back',
): Promise<{ path: string } | { error: string }> {
  if (file.size > MAX_SIZE) return { error: 'La photo ne doit pas dépasser 5 Mo.' }
  if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
    return { error: 'Format accepté : JPEG, PNG ou WebP.' }
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : (file.type.split('/')[1] ?? 'bin')
  const path = `${userId}/${side}_${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = createAdminClient()

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    logger.error({ error, path }, '[storage] Échec upload photo')
    return { error: 'Erreur lors du téléversement. Réessayez.' }
  }
  return { path }
}

export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) {
    logger.error({ error, path }, '[storage] Échec URL signée')
    return null
  }
  return data.signedUrl
}

export async function deletePhoto(path: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (error) {
    logger.error({ error, path }, '[storage] Échec suppression photo')
  }
}

export async function deletePhotos(paths: (string | null | undefined)[]): Promise<void> {
  const valid = paths.filter(Boolean) as string[]
  if (valid.length === 0) return
  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).remove(valid)
  if (error) {
    logger.error({ error, paths: valid }, '[storage] Échec suppression photos')
  }
}

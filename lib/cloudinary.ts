import 'server-only'
import { v2 as cloudinary } from 'cloudinary'
import { serverEnv } from '@/lib/env.server'

function isConfigured(): boolean {
  return Boolean(
    serverEnv.CLOUDINARY_CLOUD_NAME &&
    serverEnv.CLOUDINARY_API_KEY &&
    serverEnv.CLOUDINARY_API_SECRET,
  )
}

function configure() {
  // Only called after isConfigured() → all three env vars are defined
  cloudinary.config({
    cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME ?? '',
    api_key: serverEnv.CLOUDINARY_API_KEY ?? '',
    api_secret: serverEnv.CLOUDINARY_API_SECRET ?? '',
    secure: true,
  })
}

export interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
}

export async function uploadSellerImage(
  buffer: Buffer,
  folder: 'logos' | 'covers',
  userId: string,
): Promise<UploadResult> {
  if (!isConfigured()) {
    throw new Error('Cloudinary non configuré — ajoutez CLOUDINARY_* dans .env.local')
  }
  configure()

  const maxBytes = folder === 'logos' ? 2 * 1024 * 1024 : 5 * 1024 * 1024
  if (buffer.length > maxBytes) {
    const mb = maxBytes / 1024 / 1024
    throw new Error(`Fichier trop volumineux — maximum ${mb}MB`)
  }

  const transformation =
    folder === 'logos'
      ? { width: 400, height: 400, crop: 'fill' as const, gravity: 'center' as const }
      : { width: 1200, height: 400, crop: 'fill' as const, gravity: 'center' as const }

  const result = await new Promise<{
    secure_url: string
    public_id: string
    width: number
    height: number
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `addmarket/sellers/${folder}/${userId}`,
        transformation,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error)
        else if (result) resolve(result)
        else reject(new Error('Upload Cloudinary échoué'))
      },
    )
    stream.end(buffer)
  })

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  }
}

export function cloudinaryConfigured(): boolean {
  return isConfigured()
}

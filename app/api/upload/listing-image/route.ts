import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { uploadListingImage, cloudinaryConfigured } from '@/lib/cloudinary'
import { uploadPublicImage } from '@/lib/storage'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sellerRows = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)
  if (!sellerRows.at(0)) {
    return NextResponse.json({ error: 'Profil vendeur requis' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format non supporté — utilisez JPEG, PNG ou WebP' },
      { status: 400 },
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux — maximum 5 Mo' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Prefer Cloudinary; fall back to Supabase Storage when not configured
  if (cloudinaryConfigured()) {
    try {
      const result = await uploadListingImage(buffer, user.id)
      return NextResponse.json({ url: result.url, publicId: result.publicId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur upload'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  try {
    const ext = file.type.split('/')[1] ?? 'jpg'
    const path = `listings/${user.id}/${Date.now()}.${ext}`
    const url = await uploadPublicImage(buffer, path, file.type)
    return NextResponse.json({ url, publicId: path })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur upload'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

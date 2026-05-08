import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { uploadListingImage, cloudinaryConfigured } from '@/lib/cloudinary'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (!cloudinaryConfigured()) {
    return NextResponse.json({ error: 'Service upload non disponible' }, { status: 503 })
  }

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

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await uploadListingImage(buffer, user.id)
    return NextResponse.json({ url: result.url, publicId: result.publicId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur upload'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

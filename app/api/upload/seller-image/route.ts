import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadSellerImage, cloudinaryConfigured } from '@/lib/cloudinary'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (!cloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'Upload Cloudinary non configuré — ajoutez CLOUDINARY_* dans .env.local' },
      { status: 503 },
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folder = formData.get('folder') as string | null

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Format non supporté (JPEG, PNG, WebP)' }, { status: 400 })
  }
  if (folder !== 'logos' && folder !== 'covers') {
    return NextResponse.json({ error: 'Dossier invalide' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await uploadSellerImage(buffer, folder, user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur upload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

'use server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendContactEmail } from '@/lib/email'

const schema = z.object({
  name: z.string().min(2, 'Nom trop court').max(100),
  email: z.string().email('Email invalide'),
  category: z.enum(['support', 'securite', 'legal', 'presse', 'partenariat']),
  message: z.string().min(10, 'Message trop court (10 caractères min)').max(5000),
})

export type ContactState = { error: string } | { success: true } | null

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const { success: allowed } = await checkRateLimit('api', ip)
  if (!allowed) return { error: 'Trop de demandes. Réessayez dans une minute.' }

  const parsed = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    category: formData.get('category'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Données invalides.' }
  }

  await sendContactEmail(parsed.data)
  return { success: true }
}

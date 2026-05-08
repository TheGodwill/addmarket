'use server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { sendFeedbackEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

interface FeedbackInput {
  type: 'bug' | 'suggestion' | 'question'
  description: string
  url: string
}

export async function submitFeedback(
  input: FeedbackInput,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const identifier = user?.id ?? ip

  const { success } = await checkRateLimit('api', identifier)
  if (!success) return { error: 'Trop de demandes. Réessayez dans une minute.' }

  const description = input.description.trim().slice(0, 2000)
  if (!description) return { error: 'La description est requise.' }

  await sendFeedbackEmail({
    type: input.type,
    description,
    url: input.url,
    ...(user?.id ? { userId: user.id, userEmail: user.email } : {}),
  })

  return { success: true }
}

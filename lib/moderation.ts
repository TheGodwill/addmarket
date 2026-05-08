import 'server-only'

// Basic banned-words list for auto-moderation of review comments.
// Reviews containing any of these patterns go to 'pending' instead of 'published'.
const BANNED_PATTERNS: RegExp[] = [
  /\b(arnaque|escroquerie|fraudeur|escroc)\b/i,
  /\b(merde|putain|connard|salaud|enculé|fdp)\b/i,
  /\b(raciste|nazi|terroriste)\b/i,
  /\b(whatsapp|telegram|signal)\s*[:\-]?\s*[\d\+]/i,
  // Phone numbers embedded in text
  /(\+33|0[67])\s*[\d\s\-\.]{8,}/,
  // URLs that aren't just domain names
  /https?:\/\/[^\s]{10,}/i,
]

export function containsBannedContent(text: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(text))
}

export function getAutoStatus(comment: string | null | undefined): 'pending' | 'published' {
  if (!comment) return 'published'
  return containsBannedContent(comment) ? 'pending' : 'published'
}

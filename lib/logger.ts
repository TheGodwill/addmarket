import pino from 'pino'

// Champs contenant des PII — jamais loggés en clair
const PII_PATHS = [
  'email',
  'phone',
  'password',
  'cardNumber',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
]

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

export const logger = pino({
  level: isTest ? 'silent' : isDev ? 'debug' : 'info',
  redact: {
    paths: PII_PATHS,
    censor: '[REDACTED]',
  },
})

// Retire manuellement les PII d'un objet avant de le passer à un contexte non-pino
export function redactPII(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = PII_PATHS.includes(k) ? '[REDACTED]' : v
  }
  return result
}

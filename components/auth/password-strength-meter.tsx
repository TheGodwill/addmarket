'use client'

import { useEffect, useState } from 'react'

interface PasswordStrengthMeterProps {
  password: string
}

const LABELS = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'] as const
const COLORS = [
  'bg-red-500',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-blue-500',
  'bg-green-500',
] as const

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const [score, setScore] = useState<number>(0)

  useEffect(() => {
    if (!password) return
    // Chargement lazy de zxcvbn (≈800KB) uniquement quand l'utilisateur tape
    let cancelled = false
    import('zxcvbn')
      .then(({ default: zxcvbn }) => {
        if (!cancelled) setScore(zxcvbn(password).score)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [password])

  if (!password) return null

  const label = LABELS[score] ?? 'Très faible'
  const color = COLORS[score] ?? 'bg-red-500'

  return (
    <div className="space-y-1" aria-label={`Force du mot de passe : ${label}`}>
      <div className="flex gap-1">
        {LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Force : <span className="font-medium">{label}</span>
      </p>
    </div>
  )
}

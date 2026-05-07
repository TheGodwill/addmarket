'use client'

import { useActionState, useState } from 'react'
import { ChurchSearch } from './church-search'
import { submitOnboarding } from '@/app/onboarding/actions'
import { FormError } from '@/components/auth/form-error'

type Step = 'church' | 'info' | 'photos' | 'confirm'

const STEPS: Step[] = ['church', 'info', 'photos', 'confirm']
const STEP_LABELS: Record<Step, string> = {
  church: 'Église',
  info: 'Informations',
  photos: 'Carte de membre',
  confirm: 'Confirmation',
}

export function OnboardingForm() {
  const [state, action, isPending] = useActionState(submitOnboarding, null)
  const [step, setStep] = useState<Step>('church')

  // Collected values across steps
  const [churchId, setChurchId] = useState('')
  const [churchLabel, setChurchLabel] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [photoFront, setPhotoFront] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const error = (state && 'error' in state ? state.error : null) ?? localError

  function validateStep(): string | null {
    if (step === 'church' && !churchId) return 'Veuillez sélectionner une église.'
    if (step === 'info') {
      if (displayName.trim().length < 2) return 'Nom trop court (2 caractères minimum).'
      if (city.trim().length < 2) return 'Ville requise.'
    }
    if (step === 'photos') {
      if (!photoFront) return 'La photo recto est requise.'
      if (!cardNumber.trim()) return 'Le numéro de carte est requis.'
      if (!/^\d{4,20}$/.test(cardNumber.trim())) return 'Numéro invalide (chiffres uniquement).'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) {
      setLocalError(err)
      return
    }
    setLocalError(null)
    const idx = STEPS.indexOf(step)
    const next = STEPS[idx + 1]
    if (next) setStep(next)
  }

  function back() {
    setLocalError(null)
    const idx = STEPS.indexOf(step)
    const prev = STEPS[idx - 1]
    if (prev) setStep(prev)
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < stepIndex
                  ? 'bg-green-600 text-white'
                  : i === stepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs ${i === stepIndex ? 'font-semibold text-gray-900' : 'text-gray-400'}`}
            >
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-gray-200" />}
          </div>
        ))}
      </div>

      <FormError message={error} />

      {/* Step content — all fields rendered in a form, hidden inputs carry previous steps */}
      <form action={action}>
        {/* Hidden inputs for all collected data */}
        <input type="hidden" name="church_id" value={churchId} />
        <input type="hidden" name="display_name" value={displayName} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="card_number" value={cardNumber} />

        {step === 'church' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">
              Recherchez votre église Assemblées de Dieu par nom ou ville.
            </p>
            <ChurchSearch
              value={churchId}
              label={churchLabel}
              onChange={(id, label) => {
                setChurchId(id)
                setChurchLabel(label)
              }}
            />
          </div>
        )}

        {step === 'info' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Nom affiché *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Prénom Nom"
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Ville *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Paris"
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Téléphone <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="+33 6 00 00 00 00"
              />
            </div>
          </div>
        )}

        {step === 'photos' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Formats acceptés : JPEG, PNG, WebP. Taille max : 5 Mo par photo.
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Photo recto *</label>
              <input
                type="file"
                name="photo_front"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFront(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              {photoFront && (
                <p className="text-xs text-green-600">
                  {photoFront.name} ({(photoFront.size / 1024 / 1024).toFixed(1)} Mo)
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Photo verso <span className="text-gray-400">(si applicable)</span>
              </label>
              <input
                type="file"
                name="photo_back"
                accept="image/jpeg,image/png,image/webp"
                onChange={() => undefined}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Numéro de carte *</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0000000000"
                maxLength={20}
              />
              <p className="text-xs text-gray-400">
                Ce numéro est haché — seuls les 4 derniers chiffres seront visibles.
              </p>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-5">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Église</dt>
                  <dd className="font-medium text-gray-900">{churchLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Nom affiché</dt>
                  <dd className="font-medium text-gray-900">{displayName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Ville</dt>
                  <dd className="font-medium text-gray-900">{city}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Carte (4 derniers chiffres)</dt>
                  <dd className="font-mono font-medium text-gray-900">
                    ****{cardNumber.slice(-4)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Photo recto</dt>
                  <dd className="font-medium text-gray-900">{photoFront?.name ?? '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="accept_cgu" required className="mt-0.5 h-4 w-4" />
                <span className="text-gray-700">
                  J&apos;accepte les{' '}
                  <a href="/cgu" target="_blank" className="text-blue-600 hover:underline">
                    Conditions Générales d&apos;Utilisation
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="accept_rgpd" required className="mt-0.5 h-4 w-4" />
                <span className="text-gray-700">
                  J&apos;accepte la{' '}
                  <a href="/rgpd" target="_blank" className="text-blue-600 hover:underline">
                    politique de confidentialité
                  </a>{' '}
                  et le traitement de mes données personnelles.
                </span>
              </label>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isPending ? 'Envoi en cours…' : 'Soumettre ma demande'}
            </button>
          </div>
        )}
      </form>

      {/* Navigation buttons (outside form for non-submit actions) */}
      {step !== 'confirm' && (
        <div className="flex justify-between">
          {step !== 'church' ? (
            <button
              type="button"
              onClick={back}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Retour
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Continuer
          </button>
        </div>
      )}
      {step === 'confirm' && (
        <button
          type="button"
          onClick={back}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retour
        </button>
      )}
    </div>
  )
}

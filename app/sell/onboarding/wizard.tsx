'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { publishSellerProfile } from './actions'

interface Category {
  id: string
  name: string
  slug: string
}

interface WizardProps {
  categories: Category[]
}

const DAYS = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
] as const

type DayKey = (typeof DAYS)[number]['key']

interface DraftData {
  businessName: string
  categoryId: string
  description: string
  serviceCities: string
  serviceAreaKm: string
  contactPhone: string
  contactEmail: string
  contactWhatsapp: string
  instagram: string
  facebook: string
  website: string
  openingHours: Record<DayKey, { enabled: boolean; open: string; close: string }>
  logoUrl: string
  coverUrl: string
}

const DEFAULT_DRAFT: DraftData = {
  businessName: '',
  categoryId: '',
  description: '',
  serviceCities: '',
  serviceAreaKm: '30',
  contactPhone: '',
  contactEmail: '',
  contactWhatsapp: '',
  instagram: '',
  facebook: '',
  website: '',
  openingHours: {
    mon: { enabled: true, open: '09:00', close: '18:00' },
    tue: { enabled: true, open: '09:00', close: '18:00' },
    wed: { enabled: true, open: '09:00', close: '18:00' },
    thu: { enabled: true, open: '09:00', close: '18:00' },
    fri: { enabled: true, open: '09:00', close: '18:00' },
    sat: { enabled: false, open: '09:00', close: '12:00' },
    sun: { enabled: false, open: '09:00', close: '12:00' },
  },
  logoUrl: '',
  coverUrl: '',
}

const DRAFT_KEY = 'seller_onboarding_draft'
const TOTAL_STEPS = 7

const STEP_LABELS = [
  'Identité',
  'Description',
  'Zone',
  'Contacts',
  'Horaires',
  'Visuels',
  'Publication',
]

export function SellerOnboardingWizard({ categories }: WizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<DraftData>(DEFAULT_DRAFT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [markdownPreview, setMarkdownPreview] = useState(false)

  // Load draft from localStorage on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) setDraft(JSON.parse(saved) as DraftData)
      } catch {
        // ignore parse errors
      }
    }
    loadDraft()
  }, [])

  // Auto-save draft to localStorage on every change
  const saveDraft = useCallback((data: DraftData) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch {
      // ignore storage errors
    }
  }, [])

  function update<K extends keyof DraftData>(key: K, value: DraftData[K]) {
    const next = { ...draft, [key]: value }
    setDraft(next)
    saveDraft(next)
    if (errors[key])
      setErrors((e) => {
        const n = { ...e }
        delete n[key]
        return n
      })
  }

  function updateHours(day: DayKey, field: 'enabled' | 'open' | 'close', value: boolean | string) {
    const next = {
      ...draft,
      openingHours: {
        ...draft.openingHours,
        [day]: { ...draft.openingHours[day], [field]: value },
      },
    }
    setDraft(next)
    saveDraft(next)
  }

  // Per-step validation
  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {}

    if (s === 1) {
      if (!draft.businessName.trim() || draft.businessName.trim().length < 2)
        errs.businessName = 'Le nom doit contenir au moins 2 caractères'
      if (!draft.categoryId) errs.categoryId = 'Choisissez une catégorie'
    }
    if (s === 2) {
      if (!draft.description.trim() || draft.description.trim().length < 20)
        errs.description = 'La description doit contenir au moins 20 caractères'
    }
    if (s === 3) {
      const cities = draft.serviceCities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      if (cities.length === 0) errs.serviceCities = 'Indiquez au moins une ville'
      const km = Number(draft.serviceAreaKm)
      if (!km || km < 1 || km > 500) errs.serviceAreaKm = 'Rayon entre 1 et 500 km'
    }
    if (s === 4) {
      if (draft.contactPhone && !isValidPhoneNumber(draft.contactPhone, 'FR'))
        errs.contactPhone = 'Numéro de téléphone invalide'
      if (draft.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail))
        errs.contactEmail = 'Email invalide'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleImageUpload(
    file: File,
    folder: 'logos' | 'covers',
    field: 'logoUrl' | 'coverUrl',
    setSending: (v: boolean) => void,
  ) {
    setSending(true)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)
    const res = await fetch('/api/upload/seller-image', { method: 'POST', body: form })
    const json = (await res.json()) as { url?: string; error?: string }
    setSending(false)
    if (json.error) {
      setErrors((e) => ({ ...e, [field]: json.error ?? 'Erreur upload' }))
    } else if (json.url) {
      update(field, json.url)
    }
  }

  async function handlePublish() {
    if (!validateStep(step)) return
    setSubmitting(true)
    setServerError('')

    const openingHours: Record<string, { open: string; close: string }> = {}
    for (const d of DAYS) {
      const h = draft.openingHours[d.key]
      if (h.enabled) openingHours[d.key] = { open: h.open, close: h.close }
    }

    const result = await publishSellerProfile({
      businessName: draft.businessName,
      categoryId: draft.categoryId,
      description: draft.description,
      serviceCities: draft.serviceCities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      serviceAreaKm: Number(draft.serviceAreaKm),
      contactPhone: draft.contactPhone || undefined,
      contactEmail: draft.contactEmail || undefined,
      contactWhatsapp: draft.contactWhatsapp || undefined,
      instagram: draft.instagram || undefined,
      facebook: draft.facebook || undefined,
      website: draft.website || undefined,
      openingHours,
      logoUrl: draft.logoUrl || undefined,
      coverUrl: draft.coverUrl || undefined,
    })

    setSubmitting(false)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/sell/dashboard?created=1')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'
  const errCls = 'mt-1 text-xs text-red-600'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            Étape {step} / {TOTAL_STEPS}
          </span>
          <span className="font-medium text-blue-600">{STEP_LABELS[step - 1]}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={`hidden text-xs sm:block ${i + 1 <= step ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Step 1 — Identity */}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Identité de votre boutique</h1>
            <div>
              <label className={labelCls}>Nom de votre boutique *</label>
              <input
                className={inputCls}
                value={draft.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="Ex : Traiteur Marie, Mode Fatou…"
                maxLength={80}
              />
              {errors.businessName && <p className={errCls}>{errors.businessName}</p>}
            </div>
            <div>
              <label className={labelCls}>Catégorie principale *</label>
              <select
                className={inputCls}
                value={draft.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
              >
                <option value="">Sélectionnez une catégorie…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className={errCls}>{errors.categoryId}</p>}
            </div>
          </div>
        )}

        {/* Step 2 — Description */}
        {step === 2 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Décrivez votre activité</h1>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={labelCls}>Description *</label>
                <button
                  type="button"
                  onClick={() => setMarkdownPreview((v) => !v)}
                  className="text-xs text-blue-600 underline"
                >
                  {markdownPreview ? 'Modifier' : 'Aperçu'}
                </button>
              </div>
              {markdownPreview ? (
                <div className="prose prose-sm min-h-[160px] max-w-none rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                    {draft.description || '*Aucune description…*'}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className={`${inputCls} min-h-[160px] resize-y`}
                  value={draft.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Décrivez vos produits/services, votre expérience, ce qui vous rend unique…&#10;&#10;Vous pouvez utiliser **gras**, *italique*, et - listes."
                  maxLength={2000}
                />
              )}
              <div className="mt-1 flex justify-between">
                {errors.description ? <p className={errCls}>{errors.description}</p> : <span />}
                <span className="text-xs text-gray-400">{draft.description.length} / 2000</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Service area */}
        {step === 3 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Zone de chalandise</h1>
            <p className="text-sm text-gray-500">
              Indiquez les villes où vous proposez vos produits/services.
            </p>
            <div>
              <label className={labelCls}>Villes desservies * (séparées par des virgules)</label>
              <input
                className={inputCls}
                value={draft.serviceCities}
                onChange={(e) => update('serviceCities', e.target.value)}
                placeholder="Ex : Abidjan, Cocody, Yopougon"
              />
              {errors.serviceCities && <p className={errCls}>{errors.serviceCities}</p>}
            </div>
            <div>
              <label className={labelCls}>
                Rayon d&apos;intervention (km) : {draft.serviceAreaKm} km
              </label>
              <input
                type="range"
                min="1"
                max="500"
                step="5"
                value={draft.serviceAreaKm}
                onChange={(e) => update('serviceAreaKm', e.target.value)}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1 km</span>
                <span>500 km</span>
              </div>
              {errors.serviceAreaKm && <p className={errCls}>{errors.serviceAreaKm}</p>}
            </div>
          </div>
        )}

        {/* Step 4 — Contacts */}
        {step === 4 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Coordonnées de contact</h1>
            <p className="text-sm text-gray-500">Tous les champs sont optionnels.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Téléphone</label>
                <input
                  className={inputCls}
                  value={draft.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  type="tel"
                />
                {errors.contactPhone && <p className={errCls}>{errors.contactPhone}</p>}
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  value={draft.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                  placeholder="votre@email.fr"
                  type="email"
                />
                {errors.contactEmail && <p className={errCls}>{errors.contactEmail}</p>}
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input
                  className={inputCls}
                  value={draft.contactWhatsapp}
                  onChange={(e) => update('contactWhatsapp', e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  type="tel"
                />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className={labelCls}>Réseaux sociaux</p>
              <div className="mt-2 space-y-3">
                {[
                  { key: 'instagram', label: 'Instagram', ph: 'https://instagram.com/…' },
                  { key: 'facebook', label: 'Facebook', ph: 'https://facebook.com/…' },
                  { key: 'website', label: 'Site web', ph: 'https://…' },
                ].map(({ key, label, ph }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-gray-500">{label}</label>
                    <input
                      className={inputCls}
                      value={draft[key as 'instagram' | 'facebook' | 'website']}
                      onChange={(e) =>
                        update(key as 'instagram' | 'facebook' | 'website', e.target.value)
                      }
                      placeholder={ph}
                      type="url"
                      rel="nofollow noopener"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Opening hours */}
        {step === 5 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Horaires d&apos;ouverture</h1>
            <p className="text-sm text-gray-500">Optionnel — laissez vide si non applicable.</p>
            <div className="space-y-2">
              {DAYS.map(({ key, label }) => {
                const h = draft.openingHours[key]
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex w-24 items-center gap-2">
                      <input
                        type="checkbox"
                        id={`day-${key}`}
                        checked={h.enabled}
                        onChange={(e) => updateHours(key, 'enabled', e.target.checked)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <label htmlFor={`day-${key}`} className="text-sm font-medium text-gray-700">
                        {label}
                      </label>
                    </div>
                    {h.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={h.open}
                          onChange={(e) => updateHours(key, 'open', e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-gray-400">à</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={(e) => updateHours(key, 'close', e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Fermé</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 6 — Images */}
        {step === 6 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold text-gray-900">Logo et image de couverture</h1>
            <p className="text-sm text-gray-500">Optionnel — vous pourrez les ajouter plus tard.</p>

            {/* Logo */}
            <div>
              <label className={labelCls}>Logo (max 2 MB — JPEG, PNG, WebP)</label>
              {draft.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.logoUrl}
                  alt="Logo"
                  className="mb-2 h-20 w-20 rounded-full border border-gray-200 object-cover"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingLogo}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) await handleImageUpload(file, 'logos', 'logoUrl', setUploadingLogo)
                }}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700"
              />
              {uploadingLogo && <p className="mt-1 text-xs text-blue-600">Upload en cours…</p>}
              {errors.logoUrl && <p className={errCls}>{errors.logoUrl}</p>}
            </div>

            {/* Cover */}
            <div>
              <label className={labelCls}>Image de couverture (max 5 MB — JPEG, PNG, WebP)</label>
              {draft.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.coverUrl}
                  alt="Couverture"
                  className="mb-2 h-28 w-full rounded-lg border border-gray-200 object-cover"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingCover}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) await handleImageUpload(file, 'covers', 'coverUrl', setUploadingCover)
                }}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700"
              />
              {uploadingCover && <p className="mt-1 text-xs text-blue-600">Upload en cours…</p>}
              {errors.coverUrl && <p className={errCls}>{errors.coverUrl}</p>}
            </div>
          </div>
        )}

        {/* Step 7 — Preview & publish */}
        {step === 7 && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold text-gray-900">Aperçu et publication</h1>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              {draft.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.coverUrl}
                  alt="Couverture"
                  className="mb-4 h-32 w-full rounded-lg object-cover"
                />
              )}
              <div className="flex items-start gap-3">
                {draft.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.logoUrl}
                    alt="Logo"
                    className="h-14 w-14 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                    {draft.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{draft.businessName || '—'}</p>
                  <p className="text-xs text-gray-500">
                    {categories.find((c) => c.id === draft.categoryId)?.name ?? ''}
                  </p>
                  {draft.serviceCities && (
                    <p className="text-xs text-gray-400">📍 {draft.serviceCities}</p>
                  )}
                </div>
              </div>
              {draft.description && (
                <div className="prose prose-sm mt-4 max-w-none text-gray-700">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                    {draft.description.slice(0, 300) + (draft.description.length > 300 ? '…' : '')}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <p className="text-sm text-gray-500">
              Votre profil sera visible immédiatement dans l&apos;annuaire des vendeurs. Vous
              pourrez le modifier à tout moment depuis votre tableau de bord.
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className={`mt-6 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button
              type="button"
              onClick={back}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Retour
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Continuer →
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? 'Publication…' : '🚀 Publier mon profil'}
            </button>
          )}
        </div>
      </div>

      {/* Draft indicator */}
      <p className="mt-3 text-center text-xs text-gray-400">Brouillon sauvegardé automatiquement</p>
    </div>
  )
}

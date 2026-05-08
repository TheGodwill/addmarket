'use client'
import { useState, useActionState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { updateSellerProfile } from '../../onboarding/actions'
import type { SellerProfile } from '@/db/schema'

interface Category {
  id: string
  name: string
}

interface Props {
  seller: SellerProfile
  categories: Category[]
}

type ActionResult = { error: string } | { success: true }

function wrapUpdate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const socialLinks = (seller: SellerProfile) => seller.socialLinks as Record<string, string>
  void socialLinks
  return updateSellerProfile({
    businessName: formData.get('businessName') as string,
    categoryId: formData.get('categoryId') as string,
    description: formData.get('description') as string,
    serviceCities: (formData.get('serviceCities') as string)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    serviceAreaKm: Number(formData.get('serviceAreaKm') ?? 30),
    contactPhone: (formData.get('contactPhone') as string) || undefined,
    contactEmail: (formData.get('contactEmail') as string) || undefined,
    contactWhatsapp: (formData.get('contactWhatsapp') as string) || undefined,
    instagram: (formData.get('instagram') as string) || undefined,
    facebook: (formData.get('facebook') as string) || undefined,
    website: (formData.get('website') as string) || undefined,
  })
}

export function EditProfileForm({ seller, categories }: Props) {
  const [preview, setPreview] = useState(false)
  const [description, setDescription] = useState(seller.description ?? '')
  const [phone, setPhone] = useState(seller.contactPhone ?? '')
  const [phoneError, setPhoneError] = useState('')

  const socialLinks = (seller.socialLinks ?? {}) as Record<string, string>

  const [state, action, pending] = useActionState(
    (_prev: ActionResult | null, formData: FormData) => wrapUpdate(_prev, formData),
    null,
  )

  function handlePhoneChange(val: string) {
    setPhone(val)
    if (val && !isValidPhoneNumber(val, 'FR')) {
      setPhoneError('Numéro invalide (ex : +33 6 12 34 56 78)')
    } else {
      setPhoneError('')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700'

  return (
    <form
      action={action}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {state && 'success' in state && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          ✅ Profil mis à jour avec succès.
        </p>
      )}
      {state && 'error' in state && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className={labelCls}>Nom de la boutique *</label>
        <input
          name="businessName"
          className={inputCls}
          defaultValue={seller.businessName}
          required
          minLength={2}
          maxLength={80}
        />
      </div>

      <div>
        <label className={labelCls}>Catégorie *</label>
        <select name="categoryId" className={inputCls} defaultValue={seller.categoryId ?? ''}>
          <option value="">Sélectionnez…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls}>Description</label>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="text-xs text-blue-600 underline"
          >
            {preview ? 'Modifier' : 'Aperçu'}
          </button>
        </div>
        {preview ? (
          <div className="prose prose-sm min-h-[120px] max-w-none rounded-lg border border-gray-200 bg-gray-50 p-4">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {description || '*Aucune description*'}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            name="description"
            className={`${inputCls} min-h-[120px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        )}
        {/* Hidden field to submit description even when in preview mode */}
        {preview && <input type="hidden" name="description" value={description} />}
      </div>

      <div>
        <label className={labelCls}>Villes desservies (séparées par des virgules)</label>
        <input
          name="serviceCities"
          className={inputCls}
          defaultValue={seller.serviceCities.join(', ')}
          placeholder="Paris, Lyon, Bordeaux"
        />
      </div>

      <div>
        <label className={labelCls}>Rayon d&apos;intervention (km)</label>
        <input
          name="serviceAreaKm"
          type="number"
          className={inputCls}
          defaultValue={seller.serviceAreaKm ?? 30}
          min={1}
          max={500}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Téléphone</label>
          <input
            name="contactPhone"
            type="tel"
            className={inputCls}
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+33 6 12 34 56 78"
          />
          {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
        </div>
        <div>
          <label className={labelCls}>Email de contact</label>
          <input
            name="contactEmail"
            type="email"
            className={inputCls}
            defaultValue={seller.contactEmail ?? ''}
          />
        </div>
        <div>
          <label className={labelCls}>WhatsApp</label>
          <input
            name="contactWhatsapp"
            type="tel"
            className={inputCls}
            defaultValue={seller.contactWhatsapp ?? ''}
            placeholder="+33 6 12 34 56 78"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className={labelCls}>Réseaux sociaux</p>
        <div className="mt-2 space-y-3">
          {[
            { name: 'instagram', label: 'Instagram', ph: 'https://instagram.com/…' },
            { name: 'facebook', label: 'Facebook', ph: 'https://facebook.com/…' },
            { name: 'website', label: 'Site web', ph: 'https://…' },
          ].map(({ name, label, ph }) => (
            <div key={name}>
              <label className="mb-1 block text-xs text-gray-500">{label}</label>
              <input
                name={name}
                type="url"
                className={inputCls}
                defaultValue={socialLinks[name] ?? ''}
                placeholder={ph}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <a
          href="/sell/dashboard"
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </a>
        <button
          type="submit"
          disabled={pending || Boolean(phoneError)}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}

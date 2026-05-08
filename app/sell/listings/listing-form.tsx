'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import Image from 'next/image'
import { createListing, updateListing } from './actions'
import type { ListingInput } from './actions'

interface Category {
  id: string
  name: string
}

interface ImageEntry {
  url: string
  altText: string
  tempId: string
}

interface Props {
  listingId?: string
  initialData?: Partial<ListingInput> & { images?: ImageEntry[] }
  categories: Category[]
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const labelCls = 'mb-1 block text-sm font-medium text-gray-700'

export function ListingForm({ listingId, initialData, categories }: Props) {
  const router = useRouter()

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '')
  const [isQuoteOnly, setIsQuoteOnly] = useState(initialData?.isQuoteOnly ?? false)
  const [priceInput, setPriceInput] = useState(
    initialData?.priceCents != null ? String(initialData.priceCents / 100) : '',
  )
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [markdownPreview, setMarkdownPreview] = useState(false)
  const [tagsInput, setTagsInput] = useState((initialData?.tags ?? []).join(', '))
  const [images, setImages] = useState<ImageEntry[]>(
    initialData?.images ?? (initialData as { images?: ImageEntry[] } | undefined)?.images ?? [],
  )
  const [uploading, setUploading] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseTags = useCallback(
    () =>
      tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    [tagsInput],
  )

  const buildPayload = useCallback(
    (status: 'draft' | 'active' | 'paused'): ListingInput => ({
      title,
      categoryId: categoryId || null,
      isQuoteOnly,
      priceCents: isQuoteOnly ? null : priceInput ? Math.round(parseFloat(priceInput) * 100) : null,
      description,
      tags: parseTags(),
      images: images.map((img) => ({ url: img.url, altText: img.altText })),
      status,
    }),
    [title, categoryId, isQuoteOnly, priceInput, description, parseTags, images],
  )

  async function handleSubmit(status: 'draft' | 'active') {
    setSubmitting(true)
    setError(null)
    const payload = buildPayload(status)
    const result = listingId
      ? await updateListing(listingId, payload)
      : await createListing(payload)
    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      router.push('/sell/listings?saved=1')
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload/listing-image', { method: 'POST', body: form })
    const json = (await res.json()) as { url?: string; error?: string }
    setUploading(false)
    if (json.error) {
      setError(json.error)
    } else if (json.url) {
      const newEntry: ImageEntry = {
        url: json.url,
        altText: '',
        tempId: `${Date.now()}-${Math.random()}`,
      }
      setImages((prev) => [...prev, newEntry])
    }
  }

  function updateAltText(tempId: string, altText: string) {
    setImages((prev) => prev.map((img) => (img.tempId === tempId ? { ...img, altText } : img)))
  }

  function removeImage(tempId: string) {
    setImages((prev) => prev.filter((img) => img.tempId !== tempId))
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newImages = [...images]
    const moved = newImages.splice(dragIdx, 1)[0]
    if (!moved) return
    newImages.splice(idx, 0, moved)
    setImages(newImages)
    setDragIdx(idx)
  }

  function handleDragEnd() {
    setDragIdx(null)
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Title */}
      <div>
        <label className={labelCls}>Titre *</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Ex: Traiteur béninois — spécialités du Bénin"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{title.length}/120</p>
      </div>

      {/* Category */}
      <div>
        <label className={labelCls}>Catégorie</label>
        <select
          className={inputCls}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Sélectionnez une catégorie…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <label className={labelCls}>Prix</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={1000000}
            step={0.01}
            className={`${inputCls} max-w-[180px]`}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            disabled={isQuoteOnly}
            placeholder="0.00"
          />
          <span className="text-sm text-gray-500">€</span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isQuoteOnly}
              onChange={(e) => {
                setIsQuoteOnly(e.target.checked)
                if (e.target.checked) setPriceInput('')
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            Sur devis uniquement
          </label>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls}>Description</label>
          <button
            type="button"
            onClick={() => setMarkdownPreview((v) => !v)}
            className="text-xs text-blue-600 underline"
          >
            {markdownPreview ? 'Modifier' : 'Aperçu Markdown'}
          </button>
        </div>
        {markdownPreview ? (
          <div className="prose prose-sm min-h-[160px] max-w-none rounded-lg border border-gray-200 bg-gray-50 p-4">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {description || '*Aucune description*'}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            className={`${inputCls} min-h-[160px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            placeholder="Décrivez votre offre en détail. Markdown supporté."
          />
        )}
        <p className="mt-1 text-right text-xs text-gray-400">{description.length}/5000</p>
      </div>

      {/* Tags */}
      <div>
        <label className={labelCls}>Tags (séparés par des virgules, max 10)</label>
        <input
          className={inputCls}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="artisanat, cuisine, afrique-de-louest"
        />
        {parseTags().length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {parseTags().map((tag) => (
              <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Images */}
      <div>
        <label className={labelCls}>Images (max 8 — JPEG, PNG, WebP — 5MB chacune)</label>
        <p className="mb-3 text-xs text-gray-500">
          Glissez-déposez pour réordonner. L&apos;alt text est requis pour l&apos;accessibilité.
        </p>

        {images.length > 0 && (
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            {images.map((img, idx) => (
              <div
                key={img.tempId}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`cursor-grab rounded-xl border p-3 ${
                  dragIdx === idx ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="relative mb-2 h-36 w-full overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={img.url}
                    alt={img.altText || `Image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <input
                  className={inputCls}
                  value={img.altText}
                  onChange={(e) => updateAltText(img.tempId, e.target.value)}
                  placeholder="Alt text (description de l'image)"
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.tempId)}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length < 8 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  await handleImageUpload(file)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-dashed border-gray-300 px-6 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
            >
              {uploading ? 'Upload en cours…' : '+ Ajouter une image'}
            </button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={submitting || !title}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer brouillon'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('active')}
          disabled={submitting || !title}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Publication…' : 'Publier'}
        </button>
      </div>
    </div>
  )
}

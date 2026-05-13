'use client'
import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { updateSellerPhoto } from './profile-photo-actions'

interface Props {
  sellerSlug: string
  field: 'logoUrl' | 'coverUrl'
  label: string
  className?: string
}

export function ProfilePhotoButton({ sellerSlug, field, label, className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('folder', field === 'logoUrl' ? 'logos' : 'covers')

    const res = await fetch('/api/upload/seller-image', { method: 'POST', body: form })
    const data = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !data.url) {
      setError(data.error ?? "Erreur lors de l'upload")
      e.target.value = ''
      return
    }

    const url = data.url
    startTransition(async () => {
      try {
        await updateSellerPhoto(sellerSlug, field, url)
      } catch {
        setError('Erreur lors de la sauvegarde')
      }
    })
    e.target.value = ''
  }

  return (
    <div className={className}>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-50"
        aria-label={label}
        type="button"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Camera className="h-3.5 w-3.5" aria-hidden />
        )}
        {isPending ? 'Enregistrement…' : label}
      </button>
      {error && <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
        aria-hidden
      />
    </div>
  )
}

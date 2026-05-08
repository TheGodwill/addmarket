'use client'
import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { submitVerificationRequest } from '../actions'

interface ChurchResult {
  id: string
  name: string
  city: string
  region: string
}

export function VerificationForm() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChurchResult[]>([])
  const [selectedChurch, setSelectedChurch] = useState<ChurchResult | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function searchChurches(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (q.length < 2) {
        setResults([])
        return
      }
      try {
        const res = await fetch(`/api/churches/search?q=${encodeURIComponent(q)}&country=CI`)
        const data = await res.json()
        setResults(data)
        setDropdownOpen(true)
      } catch {
        setResults([])
      }
    }, 250)
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    setSelectedChurch(null)
    searchChurches(v)
  }

  function selectChurch(c: ChurchResult) {
    setSelectedChurch(c)
    setQuery(`${c.name} — ${c.city}`)
    setDropdownOpen(false)
    setResults([])
  }

  function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) {
      setter(null)
      return
    }
    const url = URL.createObjectURL(file)
    setter(url)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!selectedChurch) {
      setError('Veuillez sélectionner une église.')
      return
    }
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    fd.set('churchId', selectedChurch.id)
    startTransition(async () => {
      const result = await submitVerificationRequest(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Church picker */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Votre église <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => results.length > 0 && setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            placeholder="Tapez le nom de la ville ou de l'église…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
          />
          {dropdownOpen && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={() => selectChurch(c)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                  >
                    <span className="font-medium text-gray-900">{c.city}</span>
                    <span className="ml-1 text-gray-500">— {c.region}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedChurch && (
          <p className="mt-1 text-xs text-green-700">
            Sélectionné : {selectedChurch.name} — {selectedChurch.city} ({selectedChurch.region})
          </p>
        )}
      </div>

      {/* Card number (optional) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Numéro de carte <span className="font-normal text-gray-400">(optionnel)</span>
        </label>
        <input
          name="cardNumber"
          type="text"
          inputMode="numeric"
          maxLength={20}
          placeholder="Ex : 12345678"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Seuls les 4 derniers chiffres sont conservés. Le numéro complet est haché.
        </p>
      </div>

      {/* Front photo */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Photo recto de la carte <span className="text-red-500">*</span>
        </label>
        <input
          name="front"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => handlePhotoChange(e, setFrontPreview)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700"
        />
        {frontPreview && (
          <Image
            src={frontPreview}
            alt="Recto"
            width={200}
            height={128}
            unoptimized
            className="mt-2 h-32 w-auto rounded-lg object-cover shadow-sm"
          />
        )}
      </div>

      {/* Back photo (optional) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Photo verso de la carte <span className="font-normal text-gray-400">(recommandé)</span>
        </label>
        <input
          name="back"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handlePhotoChange(e, setBackPreview)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700"
        />
        {backPreview && (
          <Image
            src={backPreview}
            alt="Verso"
            width={200}
            height={128}
            unoptimized
            className="mt-2 h-32 w-auto rounded-lg object-cover shadow-sm"
          />
        )}
      </div>

      <button
        type="submit"
        disabled={pending || !selectedChurch}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Envoi en cours…' : 'Soumettre la demande'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Photos stockées de façon sécurisée. Supprimées après traitement.
      </p>
    </form>
  )
}

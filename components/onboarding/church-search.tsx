'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { searchChurches } from '@/app/onboarding/actions'

interface ChurchResult {
  id: string
  name: string
  city: string
}

interface ChurchSearchProps {
  value: string
  label: string
  onChange: (id: string, label: string) => void
}

export function ChurchSearch({ value, label, onChange }: ChurchSearchProps) {
  const [query, setQuery] = useState(label)
  const [results, setResults] = useState<ChurchResult[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    startTransition(async () => {
      const data = await searchChurches(q)
      setResults(data)
      setOpen(true)
    })
  }, [])

  useEffect(() => {
    const id = setTimeout(() => search(query), 300)
    return () => clearTimeout(id)
  }, [query, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(church: ChurchResult) {
    const lbl = `${church.name} — ${church.city}`
    setQuery(lbl)
    setOpen(false)
    setResults([])
    onChange(church.id, lbl)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (value) onChange('', '')
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Rechercher une église (nom ou ville)…"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="church-search-listbox"
      />
      {isPending && (
        <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      )}
      {open && results.length > 0 && (
        <ul
          id="church-search-listbox"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {results.map((church) => (
            <li
              key={church.id}
              role="option"
              aria-selected={church.id === value}
              onClick={() => select(church)}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-blue-50"
            >
              <span className="font-medium text-gray-900">{church.name}</span>
              <span className="ml-2 text-gray-500">{church.city}</span>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && query.length >= 2 && !isPending && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
          Aucune église trouvée pour &quot;{query}&quot;
        </div>
      )}
      {value && <p className="mt-1 text-xs text-green-600">Église sélectionnée ✓</p>}
    </div>
  )
}

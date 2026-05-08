'use client'
import { useState, useRef, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface Suggestion {
  name: string
  lat: number
  lng: number
  region?: string
}

interface Props {
  defaultValue?: string
  onSelect: (city: string, lat: number, lng: number) => void
  onClear: () => void
}

export function CityInput({ defaultValue = '', onSelect, onClear }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useDebouncedCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    void fetch(`/api/geo/cities?q=${encodeURIComponent(q)}`)
      .then(async (res) => {
        if (res.ok) setSuggestions((await res.json()) as Suggestion[])
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, 300)

  function handleChange(v: string) {
    setValue(v)
    if (!v) {
      onClear()
      setSuggestions([])
      return
    }
    void fetchSuggestions(v)
    setOpen(true)
  }

  function handleSelect(s: Suggestion) {
    setValue(s.name)
    setSuggestions([])
    setOpen(false)
    onSelect(s.name, s.lat, s.lng)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Ex : Lyon"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-2 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.lat},${s.lng}`}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {s.name}
                {s.region && <span className="ml-1 text-xs text-gray-400">{s.region}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

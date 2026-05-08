'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { CityInput } from './city-input'

interface Category {
  id: string
  name: string
  slug: string
}

interface Props {
  categories: Category[]
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'newest', label: 'Plus récents' },
]

export function SearchFilters({ categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const set = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') ?? 'relevance'
  const priceMin = searchParams.get('price_min') ?? ''
  const priceMax = searchParams.get('price_max') ?? ''
  const city = searchParams.get('city') ?? ''

  function handleNearMe() {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par ce navigateur')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const params = new URLSearchParams(searchParams.toString())
        params.set('lat', pos.coords.latitude.toFixed(6))
        params.set('lng', pos.coords.longitude.toFixed(6))
        params.set('radius', '25')
        params.delete('city')
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      },
      () => {
        setGeoLoading(false)
        setGeoError('Autorisation refusée. Activez la localisation dans les paramètres.')
      },
      { timeout: 8000 },
    )
  }

  return (
    <aside className="space-y-6">
      {/* Sort */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Tri</h3>
        <select
          value={sort}
          onChange={(e) => set('sort', e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Catégorie</h3>
          <div className="space-y-1">
            <button
              onClick={() => set('category', undefined)}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                !category
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => set('category', cat.id)}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                  category === cat.id
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Prix (€)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={priceMin}
            onChange={(e) =>
              set('price_min', e.target.value ? String(Number(e.target.value) * 100) : undefined)
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={priceMax}
            onChange={(e) =>
              set('price_max', e.target.value ? String(Number(e.target.value) * 100) : undefined)
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Localisation */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Localisation</h3>
        <button
          type="button"
          onClick={handleNearMe}
          disabled={geoLoading}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {geoLoading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-blue-700" />
          ) : (
            '📍'
          )}
          Près de chez moi
        </button>
        {geoError && <p className="mb-1 text-xs text-red-500">{geoError}</p>}
        <CityInput
          defaultValue={city}
          onSelect={(name) => set('city', name)}
          onClear={() => set('city', undefined)}
        />
      </div>

      {/* Reset */}
      <button
        onClick={() => router.push(pathname)}
        className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
      >
        Réinitialiser les filtres
      </button>
    </aside>
  )
}

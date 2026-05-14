'use client'
import { useEffect, useRef, useState } from 'react'
import type { SellerMapPin } from './page'

interface Props {
  pins: SellerMapPin[]
}

// Leaflet is loaded dynamically to avoid SSR issues (it reads `window`)
async function loadLeaflet() {
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css' as never)
  return L
}

export function ExploreMap({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [selected, setSelected] = useState<SellerMapPin | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return

        // Fix default icon paths broken by webpack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        // Centre on Abidjan, Côte d'Ivoire
        if (!containerRef.current) return
        const map = L.map(containerRef.current, { zoomControl: true }).setView(
          [5.3599517, -4.0082563],
          12,
        )

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapRef.current = map as any

        pins.forEach((pin) => {
          const marker = L.marker([pin.lat, pin.lng])
            .addTo(map)
            .bindTooltip(pin.businessName, { permanent: false, direction: 'top' })

          marker.on('click', () => setSelected(pin))
        })

        // Fit bounds if we have pins
        if (pins.length > 0) {
          const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]))
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
        }
      })
      .catch(console.error)

    return () => {
      cancelled = true
      if (mapRef.current) {
        ;(mapRef.current as { remove(): void }).remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative flex-1">
      <div ref={containerRef} className="h-full w-full" aria-label="Carte des vendeurs" />

      {/* Seller preview popup */}
      {selected && (
        <div className="absolute bottom-6 left-1/2 z-[1000] w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
            aria-label="Fermer"
          >
            ✕
          </button>
          <p className="pr-6 font-semibold text-gray-900">{selected.businessName}</p>
          {selected.categoryName && (
            <p className="text-xs text-gray-400">{selected.categoryName}</p>
          )}
          {selected.serviceCities.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">📍 {selected.serviceCities[0]}</p>
          )}
          {selected.reviewCount > 0 && selected.avgRating != null && (
            <p className="mt-1 text-xs text-amber-500">
              {'★'.repeat(Math.round(Number(selected.avgRating)))}
              {'☆'.repeat(5 - Math.round(Number(selected.avgRating)))}
              <span className="ml-1 text-gray-400">({selected.reviewCount} avis)</span>
            </p>
          )}
          <a
            href={`/sellers/${selected.slug ?? selected.id}`}
            className="mt-3 block rounded-lg bg-blue-600 py-1.5 text-center text-xs font-semibold text-white hover:bg-blue-700"
          >
            Voir le profil →
          </a>
        </div>
      )}

      <a
        href="/explore?view=list"
        className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow hover:bg-gray-50"
      >
        Vue liste
      </a>
    </div>
  )
}

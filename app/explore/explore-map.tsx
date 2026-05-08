'use client'
import { useEffect, useRef, useState } from 'react'
import type { SellerMapPin } from './page'

// Lazy-load mapbox-gl only on the map page to avoid bundle bloat
async function loadMapbox() {
  const mapboxgl = (await import('mapbox-gl')).default
  await import('mapbox-gl/dist/mapbox-gl.css' as never)
  return mapboxgl
}

interface Props {
  pins: SellerMapPin[]
}

export function ExploreMap({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [selected, setSelected] = useState<SellerMapPin | null>(null)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      // Schedule state update outside the synchronous effect body
      const t = setTimeout(() => setMapError(true), 0)
      return () => clearTimeout(t)
    }

    let cancelled = false

    loadMapbox()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current) return

        mapboxgl.accessToken = token

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [2.3522, 46.8566], // France center
          zoom: 5,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapRef.current = map as any

        map.on('load', () => {
          // GeoJSON source for sellers
          map.addSource('sellers', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: pins.map((p) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                properties: {
                  id: p.id,
                  name: p.businessName,
                  city: p.serviceCities[0] ?? '',
                  rating: p.avgRating ?? 0,
                },
              })),
            },
            cluster: true,
            clusterMaxZoom: 12,
            clusterRadius: 50,
          })

          // Cluster circles
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'sellers',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#3b82f6',
                5,
                '#1d4ed8',
                20,
                '#1e3a8a',
              ],
              'circle-radius': ['step', ['get', 'point_count'], 20, 5, 28, 20, 36],
            },
          })

          // Cluster count label
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'sellers',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            },
            paint: { 'text-color': '#ffffff' },
          })

          // Individual markers
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'sellers',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#3b82f6',
              'circle-radius': 10,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })

          // Expand cluster on click
          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
            const f = features.at(0)
            if (!f) return
            const clusterId = f.properties?.cluster_id as number
            const source = map.getSource('sellers') as mapboxgl.GeoJSONSource
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return
              map.easeTo({
                center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
                zoom: zoom ?? 10,
              })
            })
          })

          // Show seller popup on single pin click
          map.on('click', 'unclustered-point', (e) => {
            const f = e.features?.at(0)
            if (!f) return
            const id = f.properties?.id as string
            const pin = pins.find((p) => p.id === id) ?? null
            setSelected(pin)
          })

          // Cursor changes
          map.on('mouseenter', 'clusters', () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', 'clusters', () => {
            map.getCanvas().style.cursor = ''
          })
          map.on('mouseenter', 'unclustered-point', () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', 'unclustered-point', () => {
            map.getCanvas().style.cursor = ''
          })
        })
      })
      .catch(() => setMapError(true))

    return () => {
      cancelled = true
      if (mapRef.current) {
        ;(mapRef.current as { remove(): void }).remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (mapError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
        <p className="text-sm">Carte indisponible</p>
        <p className="text-xs">Configurez NEXT_PUBLIC_MAPBOX_TOKEN pour activer la carte.</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <div ref={containerRef} className="h-full w-full" aria-label="Carte des vendeurs" />

      {/* Seller preview popup */}
      {selected && (
        <div className="absolute bottom-6 left-1/2 z-10 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
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

      {/* Accessibility: always-available list fallback */}
      <a
        href="/explore?view=list"
        className="absolute bottom-4 right-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow hover:bg-gray-50"
      >
        Vue liste
      </a>
    </div>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface GalleryImage {
  url: string
  altText: string
}

interface Props {
  images: GalleryImage[]
  title: string
}

export function ImageGallery({ images, title }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const close = useCallback(() => setLightboxIdx(null), [])

  const prev = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + images.length) % images.length))
  }, [images.length])

  const next = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % images.length))
  }, [images.length])

  useEffect(() => {
    if (lightboxIdx === null) return
    const handler = (e: KeyboardEvent) => {
      const handle = () => {
        if (e.key === 'Escape') close()
        else if (e.key === 'ArrowLeft') prev()
        else if (e.key === 'ArrowRight') next()
      }
      handle()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxIdx, close, prev, next])

  if (images.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-100">
        <p className="text-sm text-gray-400">Aucune image disponible</p>
      </div>
    )
  }

  const main = images[0]
  const thumbs = images.slice(1, 5)

  return (
    <>
      {/* Grid */}
      <div className={`grid gap-2 ${images.length > 1 ? 'grid-cols-4' : 'grid-cols-1'}`}>
        <button
          onClick={() => setLightboxIdx(0)}
          className={`relative overflow-hidden rounded-xl bg-gray-100 ${
            images.length > 1 ? 'col-span-3 row-span-2 h-80' : 'h-96 w-full'
          }`}
          aria-label={`Voir ${main?.altText || title}`}
        >
          {main && (
            <Image
              src={main.url}
              alt={main.altText || title}
              fill
              className="object-cover transition-transform hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 60vw"
              priority
            />
          )}
        </button>
        {thumbs.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightboxIdx(i + 1)}
            className="relative h-[calc(10rem-4px)] overflow-hidden rounded-xl bg-gray-100 last:relative"
            aria-label={`Voir image ${i + 2}`}
          >
            <Image
              src={img.url}
              alt={img.altText || `${title} — image ${i + 2}`}
              fill
              className="object-cover transition-transform hover:scale-[1.02]"
              sizes="20vw"
            />
            {i === 3 && images.length > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                +{images.length - 4}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galerie d'images"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Image précédente"
          >
            ‹
          </button>

          <div
            className="relative h-full max-h-[90vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {images[lightboxIdx] && (
              <Image
                src={images[lightboxIdx].url}
                alt={images[lightboxIdx].altText || title}
                fill
                className="object-contain"
                sizes="90vw"
              />
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Image suivante"
          >
            ›
          </button>

          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fermer la galerie"
          >
            ✕
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {lightboxIdx + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  )
}

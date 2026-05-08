'use client'
import Link from 'next/link'
import Image from 'next/image'
import type { SellerMapPin } from './page'

export function ExploreList({ pins }: { pins: SellerMapPin[] }) {
  if (pins.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Aucun vendeur géolocalisé pour le moment.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pins.map((seller) => (
          <Link
            key={seller.id}
            href={`/sellers/${seller.slug ?? seller.id}`}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:shadow-md"
          >
            {seller.logoUrl ? (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                <Image
                  src={seller.logoUrl}
                  alt={seller.businessName}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                {seller.businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{seller.businessName}</p>
              {seller.serviceCities.length > 0 && (
                <p className="text-xs text-gray-400">{seller.serviceCities[0]}</p>
              )}
              {seller.reviewCount > 0 && seller.avgRating != null && (
                <p className="text-xs text-amber-500">
                  {'★'.repeat(Math.round(Number(seller.avgRating)))}
                  {'☆'.repeat(5 - Math.round(Number(seller.avgRating)))}
                  <span className="ml-1 text-gray-400">({seller.reviewCount})</span>
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

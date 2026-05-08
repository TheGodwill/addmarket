'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface Props {
  defaultValue?: string
  placeholder?: string
  className?: string
}

export function SearchBar({ defaultValue = '', placeholder = 'Rechercher…', className }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete('page')
      return params.toString()
    },
    [searchParams],
  )

  const handleChange = useDebouncedCallback((value: string) => {
    startTransition(() => {
      router.push(`${pathname}?${createQueryString('q', value)}`, { scroll: false })
    })
  }, 300)

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>
      <input
        type="search"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
    </div>
  )
}

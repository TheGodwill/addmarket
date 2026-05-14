'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface Props {
  isLoggedIn: boolean
}

export function MobileMenu({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="absolute inset-x-0 top-full z-50 border-b border-gray-200 bg-white px-4 pb-4 shadow-lg"
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col gap-1 pt-2">
            <Link
              href="/search"
              className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Rechercher
            </Link>
            <Link
              href="/explore"
              className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Explorer
            </Link>
            <Link
              href="/sellers"
              className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Vendeurs
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/messages"
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Messages
                </Link>
                <Link
                  href="/sell"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Vendre
                </Link>
                <Link
                  href="/account"
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Mon compte
                </Link>
                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  S&apos;inscrire
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}

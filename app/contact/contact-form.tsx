'use client'
import { useState, useTransition } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { submitContact } from './actions'

const CATEGORIES = [
  { value: 'support', label: 'Support technique' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'legal', label: 'Légal / RGPD' },
  { value: 'presse', label: 'Presse' },
  { value: 'partenariat', label: 'Partenariat' },
]

export function ContactForm() {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await submitContact(null, formData)
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-10 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" aria-hidden />
        <h2 className="text-xl font-semibold text-gray-900">Message envoyé !</h2>
        <p className="text-gray-600">
          Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Nom complet{' '}
            <span aria-hidden className="text-red-500">
              *
            </span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email{' '}
            <span aria-hidden className="text-red-500">
              *
            </span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="vous@example.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-category"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Catégorie{' '}
          <span aria-hidden className="text-red-500">
            *
          </span>
        </label>
        <select
          id="contact-category"
          name="category"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="" disabled>
            Choisir une catégorie…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-gray-700">
          Message{' '}
          <span aria-hidden className="text-red-500">
            *
          </span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          maxLength={5000}
          className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Décrivez votre demande en détail…"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Envoyer le message
      </button>
    </form>
  )
}

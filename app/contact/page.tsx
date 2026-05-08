import type { Metadata } from 'next'
import { Mail, Shield, Scale, Newspaper, Handshake, Headphones } from 'lucide-react'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Contactez l'équipe ADDMarket pour toute question de support, sécurité ou partenariat.",
}

const CONTACT_ITEMS = [
  {
    icon: Headphones,
    title: 'Support technique',
    desc: 'Problème avec votre compte, une annonce ou un paiement.',
  },
  {
    icon: Shield,
    title: 'Sécurité',
    desc: 'Signaler une vulnérabilité ou un incident de sécurité.',
  },
  {
    icon: Scale,
    title: 'Légal / RGPD',
    desc: 'Demande de données personnelles, mise en demeure, droits RGPD.',
  },
  {
    icon: Newspaper,
    title: 'Presse',
    desc: 'Demandes médias, interviews, communiqués de presse.',
  },
  {
    icon: Handshake,
    title: 'Partenariat',
    desc: 'Propositions de partenariat ou collaboration avec ADD CI.',
  },
]

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-7 w-7 text-blue-600" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Contactez-nous</h1>
          <p className="mt-2 text-gray-600">
            Notre équipe vous répond généralement sous 24-48h (jours ouvrés).
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Contact cards — left column */}
          <aside className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Types de demandes
            </h2>
            <ul className="space-y-3">
              {CONTACT_ITEMS.map(({ icon: Icon, title, desc }) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs text-gray-500">
              Pour les urgences sécurité, précisez{' '}
              <span className="font-semibold text-gray-700">[SÉCURITÉ]</span> en objet et choisissez
              la catégorie correspondante.
            </p>
          </aside>

          {/* Form — right column */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  )
}

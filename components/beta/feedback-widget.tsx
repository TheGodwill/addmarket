'use client'
import { useState, useTransition } from 'react'
import { MessageCircle, X, Loader2, CheckCircle } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { submitFeedback } from '@/app/feedback/actions'

type FeedbackType = 'bug' | 'suggestion' | 'question'

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug',
  suggestion: 'Idée',
  question: 'Question',
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [desc, setDesc] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function reset() {
    setType('suggestion')
    setDesc('')
    setDone(false)
    setError('')
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = desc.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await submitFeedback({
        type,
        description: trimmed,
        url: window.location.href,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Envoyer un retour"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Retour</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className="fixed bottom-20 right-6 z-50 w-80 rounded-xl bg-white p-5 shadow-xl focus:outline-none sm:right-6"
          aria-describedby="feedback-desc"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              Envoyer un retour
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <p id="feedback-desc" className="sr-only">
            Formulaire pour signaler un bug, une idée ou poser une question sur ADDMarket.
          </p>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-10 w-10 text-green-500" aria-hidden />
              <p className="text-sm font-semibold text-gray-900">Merci pour votre retour !</p>
              <p className="text-xs text-gray-500">Il nous aide à améliorer ADDMarket.</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-gray-700">Type</legend>
                <div className="flex gap-2">
                  {(Object.keys(TYPE_LABELS) as FeedbackType[]).map((t) => (
                    <label
                      key={t}
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        type === t
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        checked={type === t}
                        onChange={() => setType(t)}
                        className="sr-only"
                      />
                      {TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="fw-desc" className="mb-1.5 block text-xs font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="fw-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  required
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Décrivez le problème ou votre idée…"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{desc.length}/2000</p>
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending || !desc.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Envoyer
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

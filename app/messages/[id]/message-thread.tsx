'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from './actions'

interface Msg {
  id: string
  senderId: string
  body: string
  createdAt: string
  readAt: string | null
}

interface Props {
  conversationId: string
  currentUserId: string
  initialMessages: Msg[]
}

export function MessageThread({ conversationId, currentUserId, initialMessages }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Msg
          setMsgs((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev
            return [...prev, row]
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await sendMessage(formData)
    setPending(false)
    if (result && 'error' in result) {
      setError(result.error)
    } else {
      formRef.current?.reset()
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Message list */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <p className="pt-8 text-center text-sm text-gray-400">
            Aucun message. Démarrez la conversation.
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.senderId === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? 'rounded-br-none bg-blue-600 text-white'
                    : 'rounded-bl-none bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`mt-1 text-xs ${mine ? 'text-blue-200' : 'text-gray-400'} text-right`}
                >
                  {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 p-4">
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <form ref={formRef} action={handleSubmit} className="flex items-end gap-2">
          <input type="hidden" name="conversationId" value={conversationId} />
          <textarea
            name="body"
            rows={2}
            maxLength={2000}
            placeholder="Votre message…"
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? '…' : 'Envoyer'}
          </button>
        </form>
        <p className="mt-1 text-right text-xs text-gray-400">
          Entrée pour envoyer · Maj+Entrée pour sauter une ligne
        </p>
      </div>
    </div>
  )
}

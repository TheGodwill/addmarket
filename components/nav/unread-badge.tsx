'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialCount: number
  userId: string
}

export function UnreadBadge({ initialCount, userId }: Props) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to new messages where sender is not the current user
    const channel = supabase
      .channel(`unread:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row = payload.new as { sender_id: string; read_at: string | null }
          // Only count messages from others
          if (row.sender_id !== userId) {
            setCount((n) => n + 1)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const prev = payload.old as { read_at: string | null }
          const next = payload.new as { sender_id: string; read_at: string | null }
          // A message was just marked read — decrement if it was from someone else
          if (!prev.read_at && next.read_at && next.sender_id !== userId) {
            setCount((n) => Math.max(0, n - 1))
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <Link
      href="/messages"
      className="relative inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      Messages
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

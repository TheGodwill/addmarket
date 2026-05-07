interface FormErrorProps {
  message?: string | null
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  )
}

export function FormSuccess({ message }: FormErrorProps) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
    >
      {message}
    </div>
  )
}

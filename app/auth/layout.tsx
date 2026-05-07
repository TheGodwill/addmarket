import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">ADDMarket</h1>
          <p className="mt-1 text-sm text-gray-500">Communauté des Assemblées de Dieu</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  )
}

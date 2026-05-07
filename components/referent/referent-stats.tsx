interface ReferentStatsProps {
  pending: number
  processedThisMonth: number
  alert: number
}

export function ReferentStats({ pending, processedThisMonth, alert }: ReferentStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div
        className={`rounded-lg border p-4 ${alert > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
      >
        <p className="text-sm text-gray-500">En attente</p>
        <p className={`mt-1 text-3xl font-bold ${alert > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {pending}
        </p>
        {alert > 0 && (
          <p className="mt-1 text-xs font-medium text-red-600">
            {alert} demande{alert > 1 ? 's' : ''} &gt; 72h ⚠
          </p>
        )}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Traitées ce mois</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{processedThisMonth}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Alerte délai</p>
        <p className={`mt-1 text-3xl font-bold ${alert > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {alert > 0 ? alert : '0'}
        </p>
        <p className="mt-1 text-xs text-gray-400">demandes &gt; 72h</p>
      </div>
    </div>
  )
}

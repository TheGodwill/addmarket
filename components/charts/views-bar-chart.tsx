// Pure SVG bar chart — server component, no client JS needed
interface DataPoint {
  day: string // ISO date string YYYY-MM-DD
  views: number
}

interface Props {
  data: DataPoint[]
  height?: number
}

export function ViewsBarChart({ data, height = 80 }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-xs text-gray-400">
        Aucune donnée
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.views), 1)
  const W = 600
  const H = height
  const gap = 2
  const barW = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length))

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        aria-label="Graphique des vues sur 30 jours"
        role="img"
      >
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.views / max) * H))
          const x = i * (barW + gap)
          const label = new Date(d.day).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })
          return (
            <rect
              key={d.day}
              x={x}
              y={H - h}
              width={barW}
              height={h}
              fill="#3b82f6"
              rx={2}
              opacity={0.85}
            >
              <title>
                {label} : {d.views} vue{d.views > 1 ? 's' : ''}
              </title>
            </rect>
          )
        })}
      </svg>

      {/* X-axis labels: first, mid, last */}
      {data.length >= 2 && (
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>
            {new Date(data.at(0)?.day ?? '').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          {data.length >= 3 && (
            <span>
              {new Date(data.at(Math.floor(data.length / 2))?.day ?? '').toLocaleDateString(
                'fr-FR',
                { day: 'numeric', month: 'short' },
              )}
            </span>
          )}
          <span>
            {new Date(data.at(-1)?.day ?? '').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      )}
    </div>
  )
}

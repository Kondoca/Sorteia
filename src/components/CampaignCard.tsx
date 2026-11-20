import { Link } from 'react-router-dom'
import type { Campaign } from '../types'
import { campaignStats, useDB } from '../lib/store'
import { brl, dateBR, hideName, pad } from '../lib/format'
import { Badge, PrizeArt, ProgressBar } from './ui'

export function StatusBadge({ c }: { c: Campaign }) {
  if (c.status === 'sorteada') return <Badge tone="gold">🏆 Sorteada</Badge>
  if (c.status === 'encerrada') return <Badge tone="muted">Vendas encerradas</Badge>
  return <Badge tone="mint">● Ativa</Badge>
}

export default function CampaignCard({ c }: { c: Campaign }) {
  const db = useDB()
  const s = campaignStats(db, c)
  const href = c.status === 'sorteada' ? `/resultado/${c.id}` : `/sorteio/${c.id}`

  return (
    <Link to={href} className="ticket group flex flex-col overflow-hidden p-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5">
      <PrizeArt emoji={c.emoji} accent={c.accent} />
      <div className="flex flex-1 flex-col gap-3 px-2 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <StatusBadge c={c} />
          <span className="text-xs text-ink/60">Sorteio {dateBR(c.drawDate)}</span>
        </div>
        <h3 className="font-display text-xl font-bold leading-tight">{c.title}</h3>

        {c.status === 'sorteada' && c.winner ? (
          <p className="text-sm text-ink/70">
            Número <span className="font-mono font-bold text-ink">{pad(c.winner.number, c.totalNumbers)}</span> · {hideName(c.winner.name)}
          </p>
        ) : (
          <div className="space-y-1.5">
            <ProgressBar percent={s.percent} />
            <div className="flex justify-between text-xs text-ink/60">
              <span>{s.percent}% vendido</span>
              <span>{s.free} livres</span>
            </div>
          </div>
        )}

        <div className="dashed-divider mt-auto" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink/60">por número</span>
          <span className="font-display text-2xl font-extrabold">{brl(c.pricePerNumber)}</span>
        </div>
      </div>
    </Link>
  )
}

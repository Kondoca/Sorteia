import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { computeWinner, useDB } from '../lib/store'
import { dateTimeBR, hideName, hidePhone, pad } from '../lib/format'
import { Button, PrizeArt } from '../components/ui'

export default function Result() {
  const { id } = useParams()
  const db = useDB()
  const c = db.campaigns.find((x) => x.id === id)
  const [check, setCheck] = useState<{ ok: boolean; hash: string; index: number; pool: number }>()
  const [checking, setChecking] = useState(false)

  if (!c) return <Navigate to="/" replace />
  if (!c.winner) return <Navigate to={`/sorteio/${c.id}`} replace />
  const w = c.winner

  const paid = db.orders.filter((o) => o.campaignId === c.id && o.status === 'pago').flatMap((o) => o.numbers).sort((a, b) => a - b)

  async function verify() {
    setChecking(true)
    const r = await computeWinner(w.seed, paid)
    setCheck({ ok: r.number === w.number, hash: r.hash, index: r.index, pool: paid.length })
    setChecking(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Link to="/ganhadores" className="text-sm text-ink/60 hover:text-ink">
        ← Ganhadores
      </Link>

      <div className="ticket mt-4 overflow-hidden p-3">
        <PrizeArt emoji={c.emoji} accent={c.accent} />
        <div className="p-4 text-center sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-ink/50">Resultado · {c.title}</p>
          <p className="animate-pop mt-4 font-mono text-7xl font-bold sm:text-8xl">{pad(w.number, c.totalNumbers)}</p>
          <p className="mt-4 font-display text-2xl font-bold">{hideName(w.name)}</p>
          <p className="text-sm text-ink/60">
            {hidePhone(w.phone)} · sorteado em {dateTimeBR(w.drawnAt)}
          </p>
        </div>
      </div>

      <section className="ticket mt-6 p-6">
        <h2 className="font-display text-2xl font-bold">Confira você mesmo</h2>
        <p className="mt-2 text-sm text-ink/70">
          O ganhador é calculado com <code className="rounded bg-line/60 px-1">SHA-256(semente + números pagos)</code>. O resto da divisão do hash
          pela quantidade de números pagos indica a posição do ganhador na lista ordenada. Com os mesmos dados, qualquer pessoa chega ao mesmo
          resultado.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-white p-3 ring-1 ring-line">
            <dt className="text-xs text-ink/50">Semente</dt>
            <dd className="font-mono font-bold">{w.seed}</dd>
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-line">
            <dt className="text-xs text-ink/50">Números pagos participantes</dt>
            <dd className="font-mono font-bold">{paid.length}</dd>
          </div>
        </dl>
        <Button className="mt-4" variant="gold" onClick={verify} disabled={checking}>
          {checking ? 'Calculando…' : 'Refazer o cálculo'}
        </Button>
        {check && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${check.ok ? 'bg-mint' : 'bg-coral/15 text-coral'}`}>
            <p className="font-semibold">{check.ok ? '✓ Resultado confere' : '✕ Resultado não confere'}</p>
            <p className="mt-1 break-all font-mono text-xs">hash: {check.hash}</p>
            <p className="font-mono text-xs">
              posição {check.index} de {check.pool} → número {pad(paid[check.index], c.totalNumbers)}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

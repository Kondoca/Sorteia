import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Campaign } from '../types'
import {
  campaignStats,
  cancelOrder,
  drawCampaign,
  expireReservations,
  markPaid,
  resetDemo,
  setCampaignStatus,
  slugify,
  upsertCampaign,
  useDB,
} from '../lib/store'
import { brl, dateBR, dateTimeBR, maskPhone, pad } from '../lib/format'
import { Badge, Button, Field, Modal, ProgressBar } from '../components/ui'
import { StatusBadge } from '../components/CampaignCard'

type Tab = 'campanhas' | 'pedidos'

export default function Admin() {
  const db = useDB()
  const [tab, setTab] = useState<Tab>('campanhas')
  const [creating, setCreating] = useState(false)
  const [drawing, setDrawing] = useState<Campaign>()

  useEffect(() => {
    expireReservations()
  }, [])

  const totals = useMemo(() => {
    let revenue = 0
    let sold = 0
    for (const c of db.campaigns) {
      const s = campaignStats(db, c)
      revenue += s.revenue
      sold += s.paid
    }
    return { revenue, sold, pending: db.orders.filter((o) => o.status === 'reservado').length }
  }, [db])

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-ink/50">Painel do organizador</p>
          <h1 className="font-display text-4xl font-extrabold">Visão geral</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => confirm('Restaurar os dados de demonstração?') && resetDemo()}>
            Restaurar demo
          </Button>
          <Button onClick={() => setCreating(true)}>+ Nova campanha</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Arrecadado', value: brl(totals.revenue) },
          { label: 'Números vendidos', value: totals.sold.toLocaleString('pt-BR') },
          { label: 'Pix aguardando', value: totals.pending },
        ].map((k) => (
          <div key={k.label} className="ticket p-5">
            <p className="text-sm text-ink/60">{k.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-1">
        {(['campanhas', 'pedidos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${tab === t ? 'bg-ink text-paper' : 'hover:bg-card'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'campanhas' ? (
        <div className="mt-4 space-y-3">
          {db.campaigns.map((c) => {
            const s = campaignStats(db, c)
            return (
              <div key={c.id} className="ticket grid items-center gap-4 p-4 md:grid-cols-[auto_1fr_200px_auto]">
                <span className="grid h-14 w-14 place-items-center rounded-xl text-3xl" style={{ background: c.accent }}>
                  {c.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold">{c.title}</p>
                    <StatusBadge c={c} />
                  </div>
                  <p className="text-sm text-ink/60">
                    {brl(c.pricePerNumber)} · {c.totalNumbers} números · sorteio {dateBR(c.drawDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <ProgressBar percent={s.percent} />
                  <p className="text-xs text-ink/60">
                    {s.paid} pagos · {s.reserved} reservados · {brl(s.revenue)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status === 'ativa' && (
                    <Button variant="ghost" className="px-3 py-1.5" onClick={() => setCampaignStatus(c.id, 'encerrada')}>
                      Encerrar vendas
                    </Button>
                  )}
                  {c.status === 'encerrada' && (
                    <>
                      <Button variant="ghost" className="px-3 py-1.5" onClick={() => setCampaignStatus(c.id, 'ativa')}>
                        Reabrir
                      </Button>
                      <Button variant="gold" className="px-3 py-1.5" disabled={s.paid === 0} onClick={() => setDrawing(c)}>
                        Sortear
                      </Button>
                    </>
                  )}
                  {c.status === 'sorteada' && (
                    <Link to={`/resultado/${c.id}`} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:bg-card">
                      Ver resultado
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Orders />
      )}

      <Modal open={creating} onClose={() => setCreating(false)}>
        {creating && <CampaignForm onDone={() => setCreating(false)} />}
      </Modal>
      <Modal open={!!drawing} onClose={() => setDrawing(undefined)}>
        {drawing && <DrawMachine campaign={drawing} onClose={() => setDrawing(undefined)} />}
      </Modal>
    </div>
  )
}

function Orders() {
  const db = useDB()
  const [campaignId, setCampaignId] = useState('todas')
  const [status, setStatus] = useState('todos')
  const list = db.orders
    .filter((o) => (campaignId === 'todas' || o.campaignId === campaignId) && (status === 'todos' || o.status === status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80)

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="rounded-full border border-line bg-white px-3 py-2 text-sm">
          <option value="todas">Todas as campanhas</option>
          {db.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-line bg-white px-3 py-2 text-sm">
          <option value="todos">Todos os status</option>
          <option value="reservado">Aguardando Pix</option>
          <option value="pago">Pagos</option>
          <option value="expirado">Expirados</option>
        </select>
      </div>

      <div className="ticket mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink/50">
            <tr className="border-b border-line">
              <th className="p-4">Participante</th>
              <th className="p-4">Campanha</th>
              <th className="p-4">Números</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const c = db.campaigns.find((x) => x.id === o.campaignId)
              return (
                <tr key={o.id} className="border-b border-line/60 last:border-0">
                  <td className="p-4">
                    <p className="font-semibold">{o.name}</p>
                    <p className="text-xs text-ink/60">
                      {maskPhone(o.phone)} · {dateTimeBR(o.createdAt)}
                    </p>
                  </td>
                  <td className="p-4">{c?.title}</td>
                  <td className="max-w-[200px] p-4 font-mono text-xs">{o.numbers.map((n) => pad(n, c?.totalNumbers ?? 100)).join(' ')}</td>
                  <td className="p-4 font-semibold">{brl(o.total)}</td>
                  <td className="p-4">
                    {o.status === 'pago' ? <Badge>Pago</Badge> : o.status === 'reservado' ? <Badge tone="coral">Aguardando</Badge> : <Badge tone="muted">Expirado</Badge>}
                  </td>
                  <td className="p-4">
                    {o.status === 'reservado' && (
                      <div className="flex gap-1">
                        <Button variant="gold" className="px-3 py-1.5 text-xs" onClick={() => markPaid(o.id)}>
                          Confirmar
                        </Button>
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => cancelOrder(o.id)}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink/60">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const EMOJIS = ['🎁', '🏍️', '🚗', '📱', '💻', '🎮', '🧰', '💵', '📺', '🚲']
const ACCENTS = ['#cfe9dc', '#fde7b0', '#f9d3c8', '#d8e2f7', '#ead9f5']

function CampaignForm({ onDone }: { onDone: () => void }) {
  const db = useDB()
  const [f, setF] = useState(() => ({
    title: '',
    description: '',
    emoji: EMOJIS[0],
    accent: ACCENTS[0],
    pricePerNumber: '2',
    totalNumbers: '100',
    drawDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
  }))
  const [error, setError] = useState<string>()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const price = Number(f.pricePerNumber.replace(',', '.'))
    const total = Number(f.totalNumbers)
    if (f.title.trim().length < 3) return setError('Dê um nome para o prêmio.')
    if (!(price > 0)) return setError('Preço inválido.')
    if (!Number.isInteger(total) || total < 10 || total > 10000) return setError('Quantidade de números deve ficar entre 10 e 10.000.')
    let id = slugify(f.title)
    while (db.campaigns.some((c) => c.id === id)) id += '-2'
    upsertCampaign({
      id,
      title: f.title.trim(),
      description: f.description.trim() || 'Sem descrição.',
      emoji: f.emoji,
      accent: f.accent,
      pricePerNumber: price,
      totalNumbers: total,
      drawDate: new Date(f.drawDate + 'T20:00:00').toISOString(),
      status: 'ativa',
      createdAt: new Date().toISOString(),
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-3xl font-bold">Nova campanha</h2>
      <Field label="Prêmio" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Bicicleta aro 29" />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Descrição</span>
        <textarea
          rows={3}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-ink"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço por número (R$)" inputMode="decimal" value={f.pricePerNumber} onChange={(e) => setF({ ...f, pricePerNumber: e.target.value })} />
        <Field label="Qtd. de números" inputMode="numeric" value={f.totalNumbers} onChange={(e) => setF({ ...f, totalNumbers: e.target.value })} />
      </div>
      <Field label="Data do sorteio" type="date" value={f.drawDate} onChange={(e) => setF({ ...f, drawDate: e.target.value })} />
      <div>
        <span className="mb-1.5 block text-sm font-medium">Ícone e cor</span>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((em) => (
            <button
              type="button"
              key={em}
              onClick={() => setF({ ...f, emoji: em })}
              className={`grid h-10 w-10 place-items-center rounded-lg text-xl ${f.emoji === em ? 'bg-ink' : 'bg-white ring-1 ring-line'}`}
            >
              {em}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {ACCENTS.map((a) => (
            <button
              type="button"
              key={a}
              aria-label={`Cor ${a}`}
              onClick={() => setF({ ...f, accent: a })}
              className={`h-8 w-8 rounded-full ${f.accent === a ? 'ring-2 ring-ink ring-offset-2' : ''}`}
              style={{ background: a }}
            />
          ))}
        </div>
      </div>
      {error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
      <Button type="submit" className="w-full py-3.5">
        Publicar campanha
      </Button>
    </form>
  )
}

function DrawMachine({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [phase, setPhase] = useState<'pronto' | 'girando' | 'fim'>('pronto')
  const [display, setDisplay] = useState(0)
  const [result, setResult] = useState<Awaited<ReturnType<typeof drawCampaign>>>()
  const [error, setError] = useState<string>()

  async function start() {
    setPhase('girando')
    const spin = setInterval(() => setDisplay(Math.floor(Math.random() * campaign.totalNumbers)), 60)
    try {
      const [r] = await Promise.all([drawCampaign(campaign.id), new Promise((res) => setTimeout(res, 2600))])
      clearInterval(spin)
      setDisplay(r.number)
      setResult(r)
      setPhase('fim')
    } catch (e) {
      clearInterval(spin)
      setError((e as Error).message)
      setPhase('pronto')
    }
  }

  return (
    <div className="relative space-y-5 overflow-hidden text-center">
      {phase === 'fim' && <Confetti />}
      <p className="text-sm font-semibold uppercase tracking-wider text-ink/50">Sorteio · {campaign.title}</p>
      <div className="rounded-3xl bg-ink px-6 py-10">
        <p className={`font-mono text-7xl font-bold text-gold ${phase === 'fim' ? 'animate-pop' : ''}`}>{pad(display, campaign.totalNumbers)}</p>
      </div>
      {phase === 'pronto' && (
        <>
          <p className="text-sm text-ink/70">Somente números pagos participam. Reservas pendentes serão canceladas.</p>
          {error && <p className="text-sm text-coral">{error}</p>}
          <Button variant="gold" className="w-full py-3.5 text-base" onClick={start}>
            Iniciar sorteio
          </Button>
        </>
      )}
      {phase === 'girando' && <p className="text-sm text-ink/70">Sorteando…</p>}
      {phase === 'fim' && result && (
        <>
          <div>
            <p className="font-display text-2xl font-bold">{result.winner.name}</p>
            <p className="text-sm text-ink/60">{maskPhone(result.winner.phone)}</p>
          </div>
          <p className="break-all rounded-xl bg-white p-3 font-mono text-[11px] text-ink/60 ring-1 ring-line">
            semente {result.winner.seed} · {result.pool} números · hash {result.hash.slice(0, 24)}…
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Fechar
            </Button>
            <Link to={`/resultado/${campaign.id}`} className="flex-1 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
              Página pública
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i)
  const colors = ['#f5c542', '#ef6f53', '#cfe9dc', '#0f3d2e']
  return (
    <div className="pointer-events-none absolute inset-0">
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute top-0 h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `confetti-fall ${1.6 + (i % 5) * 0.3}s ease-in ${(i % 8) * 0.08}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { campaignStats, expireReservations, numberStatus, useDB } from '../lib/store'
import { brl, dateBR, pad } from '../lib/format'
import { Button, Modal, PrizeArt, ProgressBar } from '../components/ui'
import { StatusBadge } from '../components/CampaignCard'
import Checkout from '../components/Checkout'

type Filter = 'todos' | 'livres' | 'selecionados'
const PAGE = 100

export default function CampaignPage() {
  const { id } = useParams()
  const db = useDB()
  const campaign = db.campaigns.find((c) => c.id === id)

  const [rawSelected, setSelected] = useState<number[]>([])
  const [filter, setFilter] = useState<Filter>('todos')
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [checkout, setCheckout] = useState(false)
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    expireReservations()
    const t = setInterval(expireReservations, 15_000)
    return () => clearInterval(t)
  }, [])

  const taken = useMemo(() => (campaign ? numberStatus(db, campaign.id) : new Map()), [db, campaign])
  // fora do checkout, números que deixaram de estar livres saem da seleção
  const selected = checkout ? rawSelected : rawSelected.filter((n) => !taken.has(n))

  if (!campaign) return <Navigate to="/" replace />
  if (campaign.status === 'sorteada') return <Navigate to={`/resultado/${campaign.id}`} replace />

  const stats = campaignStats(db, campaign)
  const open = campaign.status === 'ativa'
  const all = Array.from({ length: campaign.totalNumbers }, (_, i) => i)
  const sel = new Set(selected)

  let visible = all
  if (filter === 'livres') visible = all.filter((n) => !taken.has(n))
  if (filter === 'selecionados') visible = selected
  if (query) visible = visible.filter((n) => pad(n, campaign.totalNumbers).includes(query))
  const pages = Math.max(1, Math.ceil(visible.length / PAGE))
  const current = Math.min(page, pages - 1)
  const shown = visible.slice(current * PAGE, current * PAGE + PAGE)

  const toggle = (n: number) => {
    if (!open || taken.has(n)) return
    setSelected(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n])
  }

  const pickRandom = (qty: number) => {
    const free = all.filter((n) => !taken.has(n) && !sel.has(n))
    const picks: number[] = []
    const buf = crypto.getRandomValues(new Uint32Array(qty))
    for (let i = 0; i < qty && free.length; i++) {
      const idx = buf[i] % free.length
      picks.push(free.splice(idx, 1)[0])
    }
    if (picks.length < qty) setNotice('Não há números livres suficientes.')
    setSelected([...selected, ...picks])
  }

  const total = selected.length * campaign.pricePerNumber

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6">
      <Link to="/" className="text-sm text-ink/60 hover:text-ink">
        ← Todos os sorteios
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <PrizeArt emoji={campaign.emoji} accent={campaign.accent} size="lg" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge c={campaign} />
            <span className="text-sm text-ink/60">Sorteio em {dateBR(campaign.drawDate)}</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{campaign.title}</h1>
          <p className="text-ink/70">{campaign.description}</p>

          <div className="ticket grid grid-cols-3 divide-x divide-line p-4 text-center">
            <div>
              <p className="font-display text-2xl font-extrabold">{brl(campaign.pricePerNumber)}</p>
              <p className="text-xs text-ink/60">por número</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold">{stats.free}</p>
              <p className="text-xs text-ink/60">livres</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold">{campaign.totalNumbers}</p>
              <p className="text-xs text-ink/60">no total</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <ProgressBar percent={stats.percent} />
            <p className="text-xs text-ink/60">{stats.percent}% dos números já foram escolhidos</p>
          </div>
        </div>

        <section>
          <div className="ticket p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold">Escolha seus números</h2>
              {open && (
                <div className="flex gap-1.5">
                  {[1, 5, 10].map((q) => (
                    <button key={q} onClick={() => pickRandom(q)} className="rounded-full bg-gold/30 px-3 py-1.5 text-xs font-semibold hover:bg-gold">
                      +{q} 🎲
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!open && <p className="mt-3 rounded-xl bg-line/60 p-3 text-sm">As vendas desta campanha foram encerradas. Aguarde o sorteio.</p>}
            {notice && (
              <p className="mt-3 flex items-center justify-between rounded-xl bg-coral/10 p-3 text-sm text-coral">
                {notice}
                <button onClick={() => setNotice(undefined)} aria-label="Fechar aviso">
                  ✕
                </button>
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(['todos', 'livres', 'selecionados'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f)
                    setPage(0)
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === f ? 'bg-ink text-paper' : 'bg-line/60 hover:bg-line'}`}
                >
                  {f}
                  {f === 'selecionados' && selected.length > 0 && ` (${selected.length})`}
                </button>
              ))}
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.replace(/\D/g, ''))
                  setPage(0)
                }}
                inputMode="numeric"
                placeholder="Buscar nº"
                className="ml-auto w-28 rounded-full border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-ink"
              />
            </div>

            <div className="mt-4 flex gap-4 text-xs text-ink/60">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-white ring-1 ring-line" /> Livre</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-gold" /> Seu</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-mint" /> Reservado</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-ink" /> Pago</span>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {shown.map((n) => {
                const st = taken.get(n)
                const mine = sel.has(n)
                const cls = mine
                  ? 'bg-gold text-ink ring-2 ring-gold-deep scale-105'
                  : st === 'pago'
                    ? 'bg-ink text-paper/60 cursor-not-allowed'
                    : st === 'reservado'
                      ? 'bg-mint text-ink/50 cursor-not-allowed'
                      : open
                        ? 'bg-white ring-1 ring-line hover:ring-ink'
                        : 'bg-white ring-1 ring-line opacity-60'
                return (
                  <button
                    key={n}
                    onClick={() => toggle(n)}
                    disabled={!!st && !mine}
                    aria-pressed={mine}
                    aria-label={`Número ${pad(n, campaign.totalNumbers)}${st ? `, ${st}` : ''}`}
                    className={`aspect-square rounded-lg font-mono text-xs font-bold transition sm:text-[13px] ${cls}`}
                  >
                    {pad(n, campaign.totalNumbers)}
                  </button>
                )
              })}
              {shown.length === 0 && <p className="col-span-full py-8 text-center text-sm text-ink/60">Nenhum número encontrado.</p>}
            </div>

            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-1">
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold ${i === current ? 'bg-ink text-paper' : 'hover:bg-line/60'}`}
                  >
                    {filter === 'todos' && !query
                      ? `${pad(i * PAGE, campaign.totalNumbers)}–${pad(Math.min(visible.length, (i + 1) * PAGE) - 1, campaign.totalNumbers)}`
                      : i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {selected.length > 0 && open && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div>
              <p className="text-sm text-ink/60">
                {selected.length} número(s) ·{' '}
                <button className="underline-offset-4 hover:underline" onClick={() => setSelected([])}>
                  limpar
                </button>
              </p>
              <p className="font-display text-2xl font-extrabold">{brl(total)}</p>
            </div>
            <Button className="px-8 py-3.5 text-base" onClick={() => setCheckout(true)}>
              Participar
            </Button>
          </div>
        </div>
      )}

      <Modal open={checkout} onClose={() => setCheckout(false)}>
        {checkout && (
          <Checkout
            campaign={campaign}
            numbers={selected}
            onDone={() => {
              setCheckout(false)
              setSelected([])
            }}
            onConflict={(nums) => {
              setCheckout(false)
              setSelected((s) => s.filter((n) => !nums.includes(n)))
              setNotice(`Os números ${nums.map((n) => pad(n, campaign.totalNumbers)).join(', ')} acabaram de ser escolhidos por outra pessoa.`)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

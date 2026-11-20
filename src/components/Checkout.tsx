import { useEffect, useState } from 'react'
import type { Campaign, Order } from '../types'
import { NumbersTakenError, cancelOrder, createOrder, markPaid, useDB } from '../lib/store'
import { brl, maskPhone, onlyDigits, pad } from '../lib/format'
import { Button, Field } from './ui'

type Step = 'dados' | 'pix' | 'pago'

function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  const ms = target ? Math.max(0, new Date(target).getTime() - now) : 0
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return { ms, label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
}

export default function Checkout({
  campaign,
  numbers,
  onDone,
  onConflict,
}: {
  campaign: Campaign
  numbers: number[]
  onDone: () => void
  onConflict: (taken: number[]) => void
}) {
  const db = useDB()
  const [stepState, setStep] = useState<Step>('dados')
  const [orderId, setOrderId] = useState<string>()
  const [form, setForm] = useState({ name: '', phone: '', email: '', terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  const order: Order | undefined = db.orders.find((o) => o.id === orderId)
  const step: Step = order?.status === 'pago' ? 'pago' : stepState
  const { ms, label } = useCountdown(step === 'pix' ? order?.expiresAt : undefined)
  const total = numbers.length * campaign.pricePerNumber

  function validate() {
    const e: Record<string, string> = {}
    if (form.name.trim().split(/\s+/).length < 2) e.name = 'Informe nome e sobrenome.'
    if (onlyDigits(form.phone).length < 10) e.phone = 'Telefone inválido.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'E-mail inválido.'
    if (!form.terms) e.terms = 'Você precisa aceitar o regulamento.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    try {
      const o = createOrder({ campaignId: campaign.id, numbers, ...form })
      setOrderId(o.id)
      setStep('pix')
    } catch (err) {
      if (err instanceof NumbersTakenError) onConflict(err.numbers)
      else setErrors({ form: (err as Error).message })
    }
  }

  async function copy() {
    if (!order) return
    try {
      await navigator.clipboard.writeText(order.pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard bloqueado */
    }
  }

  if (step === 'dados')
    return (
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <p className="text-sm text-ink/60">{campaign.title}</p>
          <h2 className="font-display text-3xl font-bold">Seus dados</h2>
        </div>
        <div className="ticket space-y-3 p-4">
          <div className="flex justify-between text-sm">
            <span>{numbers.length} número(s)</span>
            <span className="font-semibold">{brl(total)}</span>
          </div>
          <NumberChips numbers={numbers} total={campaign.totalNumbers} />
        </div>
        <Field label="Nome completo" autoComplete="name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field
          label="WhatsApp"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          value={form.phone}
          error={errors.phone}
          hint="Usado para consultar seus números e avisar se você ganhar."
          onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
        />
        <Field label="E-mail" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
          <span>
            Li e aceito o regulamento e confirmo que tenho 18 anos ou mais.
            {errors.terms && <span className="block text-xs text-coral">{errors.terms}</span>}
          </span>
        </label>
        {errors.form && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{errors.form}</p>}
        <Button type="submit" variant="primary" className="w-full py-3.5 text-base">
          Gerar Pix de {brl(total)}
        </Button>
      </form>
    )

  if (step === 'pix' && order)
    return (
      <div className="space-y-5 text-center">
        <div>
          <p className="text-sm text-ink/60">Pedido #{order.id.slice(0, 6).toUpperCase()}</p>
          <h2 className="font-display text-3xl font-bold">Pague com Pix</h2>
        </div>

        {order.status === 'expirado' || ms === 0 ? (
          <div className="rounded-2xl bg-coral/10 p-6 text-coral">
            <p className="font-semibold">A reserva expirou.</p>
            <p className="mt-1 text-sm">Os números voltaram para a grade. Escolha novamente para participar.</p>
            <Button variant="ghost" className="mt-4" onClick={onDone}>
              Voltar
            </Button>
          </div>
        ) : (
          <>
            <div className="mx-auto w-fit rounded-2xl border border-line bg-white p-4">
              <FakeQR seed={order.id} />
            </div>
            <p className="text-sm text-ink/70">
              Reserva válida por <span className="font-mono font-bold text-ink">{label}</span>
            </p>
            <div className="rounded-xl border border-line bg-white p-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink/50">Pix copia e cola</p>
              <p className="break-all font-mono text-[11px] leading-relaxed text-ink/70">{order.pixCode}</p>
            </div>
            <Button variant="ghost" className="w-full" onClick={copy}>
              {copied ? '✓ Copiado' : 'Copiar código'}
            </Button>
            <div className="rounded-2xl border-2 border-dashed border-gold bg-gold/10 p-4">
              <p className="text-xs text-ink/70">Modo demonstração: nenhum Pix real é gerado.</p>
              <Button variant="gold" className="mt-3 w-full" onClick={() => markPaid(order.id)}>
                Simular pagamento aprovado
              </Button>
            </div>
            <button
              className="text-sm text-ink/60 underline-offset-4 hover:underline"
              onClick={() => {
                cancelOrder(order.id)
                onDone()
              }}
            >
              Cancelar reserva
            </button>
          </>
        )}
      </div>
    )

  return (
    <div className="space-y-5 text-center">
      <div className="animate-pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-mint text-4xl">✓</div>
      <h2 className="font-display text-3xl font-bold">Pagamento confirmado!</h2>
      <p className="text-ink/70">Seus números estão garantidos no sorteio de {campaign.title}.</p>
      <div className="ticket ticket-cut p-5">
        <NumberChips numbers={numbers} total={campaign.totalNumbers} />
      </div>
      <Button className="w-full" onClick={onDone}>
        Fechar
      </Button>
    </div>
  )
}

function NumberChips({ numbers, total }: { numbers: number[]; total: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {numbers.map((n) => (
        <span key={n} className="rounded-md bg-mint px-2 py-1 font-mono text-xs font-bold">
          {pad(n, total)}
        </span>
      ))}
    </div>
  )
}

/** QR "decorativo" gerado a partir do id do pedido (não é um QR Code válido) */
function FakeQR({ seed }: { seed: string }) {
  const size = 25
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const cells: boolean[] = []
  for (let i = 0; i < size * size; i++) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    cells.push((h >>> 0) % 2 === 0)
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox
        const dy = y - oy
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0
      }
    }
    return -1
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44" shapeRendering="crispEdges" aria-label="QR Code ilustrativo">
      {cells.map((on, i) => {
        const x = i % size
        const y = Math.floor(i / size)
        const f = finder(x, y)
        const fill = f === -1 ? on : f === 1
        return fill ? <rect key={i} x={x} y={y} width={1} height={1} fill="#0f3d2e" /> : null
      })}
    </svg>
  )
}

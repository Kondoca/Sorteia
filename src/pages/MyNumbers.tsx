import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB } from '../lib/store'
import { brl, dateTimeBR, maskPhone, onlyDigits, pad } from '../lib/format'
import { Badge, Button, Field } from '../components/ui'

export default function MyNumbers() {
  const db = useDB()
  const [phone, setPhone] = useState('')
  const [searched, setSearched] = useState<string>()

  const orders = searched ? db.orders.filter((o) => o.phone === searched && o.status !== 'expirado') : []

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Meus números</h1>
      <p className="mt-2 text-ink/70">Digite o WhatsApp usado na compra para ver suas participações.</p>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          setSearched(onlyDigits(phone))
        }}
      >
        <div className="flex-1">
          <Field label="WhatsApp" inputMode="tel" placeholder="(11) 91234-5678" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
        </div>
        <Button type="submit" className="py-3.5" disabled={onlyDigits(phone).length < 10}>
          Buscar
        </Button>
      </form>

      {searched !== undefined && (
        <div className="mt-8 space-y-4">
          {orders.length === 0 && <p className="ticket p-6 text-center text-ink/60">Nenhuma participação encontrada para este número.</p>}
          {orders.map((o) => {
            const c = db.campaigns.find((x) => x.id === o.campaignId)
            if (!c) return null
            const won = c.winner && o.numbers.includes(c.winner.number)
            return (
              <div key={o.id} className={`ticket ticket-cut p-5 ${won ? 'ring-2 ring-gold' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link to={c.status === 'sorteada' ? `/resultado/${c.id}` : `/sorteio/${c.id}`} className="font-display text-xl font-bold hover:underline">
                      {c.emoji} {c.title}
                    </Link>
                    <p className="text-xs text-ink/60">
                      {dateTimeBR(o.createdAt)} · {brl(o.total)}
                    </p>
                  </div>
                  {won ? <Badge tone="gold">🏆 Você ganhou!</Badge> : o.status === 'pago' ? <Badge>Pago</Badge> : <Badge tone="coral">Aguardando Pix</Badge>}
                </div>
                <div className="dashed-divider my-4" />
                <div className="flex flex-wrap gap-1.5">
                  {o.numbers.map((n) => (
                    <span key={n} className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${c.winner?.number === n ? 'bg-gold' : 'bg-mint'}`}>
                      {pad(n, c.totalNumbers)}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

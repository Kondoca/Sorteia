import { Link } from 'react-router-dom'
import { useDB } from '../lib/store'
import { dateBR, hideName, pad } from '../lib/format'

export default function Winners() {
  const db = useDB()
  const done = db.campaigns
    .filter((c) => c.winner)
    .sort((a, b) => new Date(b.winner!.drawnAt).getTime() - new Date(a.winner!.drawnAt).getTime())

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Ganhadores</h1>
      <p className="mt-2 text-ink/70">Todos os resultados, com prova verificável.</p>
      <div className="mt-8 space-y-3">
        {done.length === 0 && <p className="ticket p-6 text-center text-ink/60">Nenhum sorteio realizado ainda.</p>}
        {done.map((c) => (
          <Link key={c.id} to={`/resultado/${c.id}`} className="ticket ticket-cut flex items-center gap-4 p-4 transition hover:shadow-lg">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-3xl" style={{ background: c.accent }}>
              {c.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold">{c.title}</p>
              <p className="text-sm text-ink/60">
                {hideName(c.winner!.name)} · {dateBR(c.winner!.drawnAt)}
              </p>
            </div>
            <span className="rounded-lg bg-gold px-3 py-2 font-mono text-lg font-bold">{pad(c.winner!.number, c.totalNumbers)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

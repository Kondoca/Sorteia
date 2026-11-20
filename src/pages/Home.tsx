import { Link } from 'react-router-dom'
import { useDB } from '../lib/store'
import CampaignCard from '../components/CampaignCard'

const steps = [
  { n: '01', title: 'Escolha seus números', text: 'Toque nos números livres da grade ou use a escolha automática.' },
  { n: '02', title: 'Pague com Pix', text: 'Seus números ficam reservados por 10 minutos enquanto você paga.' },
  { n: '03', title: 'Acompanhe o sorteio', text: 'O resultado é público e qualquer pessoa pode conferir a conta.' },
]

export default function Home() {
  const db = useDB()
  const active = db.campaigns.filter((c) => c.status === 'ativa')
  const finished = db.campaigns.filter((c) => c.status !== 'ativa')
  const featured = active[0]

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-4 inline-block rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink/70">
              Sorteio transparente · Pix na hora
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
              Escolha seu número.
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">Torça.</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-4 bg-gold sm:bottom-2 sm:h-6" />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink/70">
              Participe dos sorteios com poucos cliques. Cada resultado vem com uma prova que você mesmo pode verificar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {featured && (
                <Link to={`/sorteio/${featured.id}`} className="rounded-full bg-ink px-6 py-3 font-semibold text-paper transition hover:bg-ink-soft">
                  Participar agora
                </Link>
              )}
              <Link to="/meus-numeros" className="rounded-full border border-line px-6 py-3 font-semibold transition hover:bg-card">
                Ver meus números
              </Link>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="ticket ticket-cut rotate-2 p-6 shadow-xl shadow-ink/10">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink/50">
                <span>Bilhete</span>
                <span className="font-mono">Nº 0427</span>
              </div>
              <div className="my-6 grid grid-cols-5 gap-2">
                {[7, 13, 21, 42, 77, 88, 99, 101, 150, 222].map((n, i) => (
                  <span
                    key={n}
                    className={`grid aspect-square place-items-center rounded-lg font-mono text-sm font-bold ${
                      i === 4 ? 'bg-gold' : i % 3 === 0 ? 'bg-ink text-paper' : 'bg-mint'
                    }`}
                  >
                    {String(n).padStart(3, '0')}
                  </span>
                ))}
              </div>
              <div className="dashed-divider" />
              <p className="mt-4 font-display text-lg font-bold">Boa sorte! 🍀</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold">Sorteios abertos</h2>
          <span className="text-sm text-ink/60">{active.length} ativos</span>
        </div>
        {active.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <p className="ticket p-8 text-center text-ink/60">Nenhum sorteio aberto no momento. Volte em breve!</p>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="mb-6 font-display text-3xl font-bold">Como funciona</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="ticket p-6">
              <span className="font-mono text-sm font-bold text-gold-deep">{s.n}</span>
              <h3 className="mt-2 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {finished.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <h2 className="mb-6 font-display text-3xl font-bold">Encerrados</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

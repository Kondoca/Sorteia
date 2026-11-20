import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const nav: { to: string; label: string; short?: string }[] = [
  { to: '/', label: 'Sorteios' },
  { to: '/meus-numeros', label: 'Meus números', short: 'Meus' },
  { to: '/ganhadores', label: 'Ganhadores' },
  { to: '/admin', label: 'Painel' },
]

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink font-mono text-xs font-bold text-gold">777</span>
      <span className="hidden font-display text-xl font-extrabold tracking-tight sm:inline">Sorteia</span>
    </Link>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-3 py-3 sm:px-6">
          <Logo />
          <nav className="flex gap-0.5 overflow-x-auto text-[13px] sm:gap-1 sm:text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-2.5 py-1.5 sm:px-3 font-medium transition ${isActive ? 'bg-ink text-paper' : 'hover:bg-card'}`
                }
              >
                {n.short ? (
                  <>
                    <span className="sm:hidden">{n.short}</span>
                    <span className="hidden sm:inline">{n.label}</span>
                  </>
                ) : (
                  n.label
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="max-w-xl">
            Projeto de portfólio para demonstração. Nenhum pagamento é real e os dados ficam salvos apenas no seu navegador.
            Sorteios pagos no Brasil exigem autorização do Ministério da Fazenda.
          </p>
        </div>
      </footer>
    </div>
  )
}

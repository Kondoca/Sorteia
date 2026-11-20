import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'

type Variant = 'primary' | 'gold' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  gold: 'bg-gold text-ink hover:bg-gold-deep',
  ghost: 'bg-transparent text-ink border border-line hover:bg-card',
  danger: 'bg-transparent text-coral border border-coral/40 hover:bg-coral/10',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        {...props}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10 ${
          error ? 'border-coral' : 'border-line'
        }`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-coral">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink/60">{hint}</span>
      ) : null}
    </label>
  )
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/70">
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-700"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  )
}

export function Badge({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'gold' | 'coral' | 'muted' }) {
  const tones = {
    mint: 'bg-mint text-ink',
    gold: 'bg-gold/30 text-ink',
    coral: 'bg-coral/15 text-coral',
    muted: 'bg-line/70 text-ink/70',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-6 shadow-2xl sm:rounded-3xl sm:p-8 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        {children}
      </div>
    </div>
  )
}

export function PrizeArt({ emoji, accent, size = 'md' }: { emoji: string; accent: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-28 text-5xl', md: 'h-44 text-7xl', lg: 'h-64 text-[7.5rem] sm:h-80' }[size]
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${s}`}
      style={{ background: accent }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 90%, #fff8 0, transparent 35%)',
        }}
      />
      <span className="relative drop-shadow-[0_10px_18px_rgba(15,61,46,0.25)]">{emoji}</span>
    </div>
  )
}

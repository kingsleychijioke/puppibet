import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { playAviator } from '@/server/sportsbook'
import { useAction } from '@/lib/actions'
import { Plane, History } from 'lucide-react'

export const Route = createFileRoute('/aviator')({ component: AviatorPage })

function AviatorPage() {
  const [phase, setPhase] = useState<'betting' | 'flying' | 'crashed'>('betting')
  const [mult, setMult] = useState(1.0)
  const [stake, setStake] = useState('200')
  const [last, setLast] = useState<{ crashX100: number; payout: number; won: boolean } | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const play = useAction(
    (cashoutX100: number) => playAviator({ data: { stakeCents: Math.round(Number(stake || '0') * 100), cashoutX100 } }),
    {
      onSuccess: (r) => {
        const v = r as unknown as { crashX100: number; payout: number; won: boolean }
        setLast(v)
        setPhase('crashed')
      },
    },
  )

  const takeOff = () => {
    setPhase('flying'); setMult(1.0)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => setMult((m) => Math.min(50, +(m * 1.06 + 0.01).toFixed(2))), 120)
  }
  const cashOut = () => {
    if (timer.current) clearInterval(timer.current)
    play.run(Math.round(mult * 100))
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  return (
    <main className="mx-auto w-full max-w-4xl px-3 pt-4">
      <h1 className="font-display text-2xl font-bold text-ink-950">Puppibet Aviator</h1>
      <p className="text-sm text-neutral-500">Stake, take off, and cash out before the plane flies away. Winnings credit your wallet instantly.</p>
      <div className="mt-3 overflow-hidden rounded-3xl bg-ink-950 p-6 text-center text-white">
        <Plane size={40} className={`mx-auto transition-transform ${phase === 'flying' ? '-translate-y-2 rotate-12 text-brand-400' : 'text-white/60'}`} />
        <p className={`mt-2 font-display text-6xl font-bold tabular-nums ${phase === 'crashed' ? 'text-red-400' : 'text-brand-400'}`}>{mult.toFixed(2)}x</p>
        <p className="text-xs uppercase tracking-widest text-white/50">
          {phase === 'betting' ? 'Place your bet' : phase === 'flying' ? 'Flying — cash out!' : 'Crashed — last round'}{' '}
          {last && phase === 'crashed' && <span className="text-white/70">· crashed @ {(last.crashX100 / 100).toFixed(2)}x · you {last.won ? `won ₦${(last.payout / 100).toLocaleString()}` : 'lost'}</span>}
        </p>
        <div className="mx-auto mt-4 flex max-w-md items-center gap-2">
          <input value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" className="w-32 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-white" aria-label="Stake in naira" />
          {phase !== 'flying' ? (
            <button disabled={!ready} onClick={takeOff} className="flex-1 rounded-xl bg-brand-400 px-4 py-2.5 font-bold text-ink-950 hover:bg-brand-300">Take off</button>
          ) : (
            <button disabled={!ready || play.pending} onClick={cashOut} className="flex-1 rounded-xl bg-amber-400 px-4 py-2.5 font-bold text-ink-950 hover:bg-amber-300">{play.pending ? 'Cashing out…' : `Cash out @ ${mult.toFixed(2)}x`}</button>
          )}
        </div>
        {play.error && <p role="alert" className="mt-2 text-sm text-red-300">{play.error}</p>}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500"><History size={13} /> Results settle into My Bets → Games. Sign in to play for real.</p>
    </main>
  )
}

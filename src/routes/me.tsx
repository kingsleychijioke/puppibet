import { Link, createFileRoute } from '@tanstack/react-router'
import { myBets, myWallet, listPromos, claimPromo, cashOut } from '@/server/sportsbook'
import { useState } from 'react'
import { useAction } from '@/lib/actions'
import { Ticket, Gift, User as UserIcon } from 'lucide-react'

export const Route = createFileRoute('/me')({
  loader: async () => {
    try {
      const [bets, wallet, promos] = await Promise.all([myBets(), myWallet(), listPromos()])
      return { bets, wallet, promos }
    } catch {
      return { bets: [], wallet: null, promos: [] } as unknown as { bets: Bet[]; wallet: { balanceCents: number; bonusCents: number } | null; promos: Promo[] }
    }
  },
  component: MePage,
})

type Leg = { label?: string; market?: string; odds?: number; fixture?: string; matchId?: string; selectionId?: string }
type Bet = { id: string; kind: string; stakeCents: number; totalOdds100: number; potentialWinCents: number; status: string; cashoutCents: number | null; createdAt: string; legs: Leg[] }
type Promo = { id: string; code: string; title: string; description: string | null; bonusCents: number }

function MePage() {
  const { bets, wallet, promos } = Route.useLoaderData() as { bets: Bet[]; wallet: { balanceCents: number; bonusCents: number } | null; promos: Promo[] }
  const [code, setCode] = useState('')
  const [claimed, setClaimed] = useState(false)
  const claim = useAction((c: string) => claimPromo({ data: { code: c } }), { onSuccess: () => setClaimed(true) })
  const cash = useAction((id: string) => cashOut({ data: { betId: id } }), {})

  if (!wallet) return <main className="mx-auto max-w-lg px-4 pt-10 text-center"><UserIcon size={32} className="mx-auto text-neutral-300" /><h1 className="mt-2 font-display text-xl font-bold">Sign in to see your dashboard</h1><Link to="/login" className="mt-3 inline-block rounded-xl bg-ink-950 px-5 py-2.5 font-semibold text-white">Sign in</Link></main>

  return (
    <main className="mx-auto w-full max-w-4xl px-3 pt-4 pb-16">
      <h1 className="font-display text-2xl font-bold text-ink-950">My Puppibet</h1>
      <p className="text-sm text-neutral-500 tabular-nums">Cash ₦{(wallet.balanceCents / 100).toLocaleString()} · Bonus ₦{(wallet.bonusCents / 100).toLocaleString()}</p>
      <section className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 font-bold"><Ticket size={16} /> My bets</h2>
        <div className="mt-2 space-y-2">
          {bets.length === 0 && <p className="text-sm text-neutral-500">No bets yet — pick odds on the home page.</p>}
          {bets.map((b) => (
            <article key={b.id} className="rounded-xl bg-neutral-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold uppercase text-xs text-neutral-500">{b.kind} · {b.status}</span>
                <span className="font-bold tabular-nums">₦{(b.stakeCents / 100).toLocaleString()} @ {(b.totalOdds100 / 100).toFixed(2)} → ₦{(b.potentialWinCents / 100).toLocaleString()}</span>
              </div>
              <ul className="mt-1 text-xs text-neutral-600">{(b.legs ?? []).map((l, i) => <li key={i}>• {l.fixture ?? l.matchId} — {l.market} {l.label} @ {(l.odds ?? 0).toFixed(2)}</li>)}</ul>
              {b.status === 'open' && (
                <button onClick={() => cash.run(b.id)} disabled={cash.pending} className="mt-2 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-amber-300">
                  {cash.pending ? 'Cashing out…' : `Cash out ₦${Math.round(b.potentialWinCents * 0.62 / 100).toLocaleString()}`}
                </button>
              )}
            </article>
          ))}
        </div>
        {cash.error && <p role="alert" className="mt-2 text-sm text-red-600">{cash.error}</p>}
      </section>
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 font-bold"><Gift size={16} /> Promos & bonuses</h2>
        <div className="mt-2 flex gap-2">
          <input value={code} onChange={(e) => { setCode(e.target.value); setClaimed(false) }} placeholder="Enter code e.g. WELCOME100" aria-label="Promo code" className="flex-1 rounded-xl border border-neutral-300 px-3 py-2.5 uppercase" />
          <button onClick={() => claim.run(code)} disabled={claim.pending} className="rounded-xl bg-ink-950 px-4 py-2.5 font-semibold text-white">Claim</button>
        </div>
        {claim.error && <p role="alert" className="mt-2 text-sm text-red-600">{claim.error}</p>}
        {claimed ? <p className="mt-2 text-sm text-emerald-700">Bonus credited to your wallet.</p> : null}
        <ul className="mt-2 space-y-1.5 text-sm">{promos.map((p) => <li key={p.id} className="rounded-xl bg-brand-50 p-2.5"><span className="font-bold">{p.code}</span> — {p.title} (+₦{(p.bonusCents / 100).toLocaleString()})<br /><span className="text-xs text-neutral-500">{p.description}</span></li>)}</ul>
      </section>
    </main>
  )
}

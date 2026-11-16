import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSlip } from '@/lib/betslip'
import { useAction } from '@/lib/actions'
import { placeBet } from '@/server/sportsbook'
import { cn } from '@/lib/utils'
import { Trash2, Ticket, Loader2 } from 'lucide-react'

export function BetslipPanel({ compact }: { compact?: boolean }) {
  const slip = useSlip()
  const nav = useNavigate()
  const [stake, setStake] = useState('10')
  const [mode, setMode] = useState<'single' | 'acc'>('acc')
  const [msg, setMsg] = useState<string | null>(null)

  const place = useAction(
    async () => {
      const s = Math.round(parseFloat(stake || '0') * 100)
      if (!s || s < 100) throw new Error('Minimum stake is $1.00')
      if (slip.count === 0) throw new Error('Add at least one selection')
      const kind = slip.count > 1 && mode === 'acc' ? 'accumulator' : 'single'
      return placeBet({
        data: {
          legs: slip.legs.map((l) => ({ matchId: l.matchId, selectionId: l.selectionId })),
          stakeCents: s,
          kind: kind as 'single' | 'accumulator',
        },
      })
    },
    {
      onSuccess: () => {
        slip.clear()
        nav({ to: '/me' as never })
      },
      onError: (e: unknown) => setMsg(e instanceof Error ? e.message : 'Could not place bet'),
    },
  )

  const win = (parseFloat(stake || '0') || 0) * (slip.combinedOdds || 0)

  return (
    <aside id="betslip" className={cn('overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm', compact && 'lg:sticky lg:top-32')}>
      <div className="flex items-center justify-between bg-ink-950 px-4 py-2.5">
        <b className="flex items-center gap-1.5 text-sm text-white"><Ticket size={15} className="text-lime-pop" /> Betslip {slip.count > 0 && <span className="rounded-full bg-lime-pop px-1.5 text-[11px] font-black text-ink-950">{slip.count}</span>}</b>
        {slip.count > 0 && <button onClick={slip.clear} className="text-[11px] font-bold text-white/60 hover:text-white">Clear all</button>}
      </div>
      <div className="space-y-2 p-3">
        {slip.count === 0 && <p className="rounded-xl bg-neutral-50 p-4 text-center text-[13px] text-neutral-500">Tap any odds to build your ticket.<br />Singles &amp; accumulators supported.</p>}
        {slip.legs.map((l) => (
          <div key={l.selectionId} className="flex items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-ink-950">{l.label}</p>
              <p className="truncate text-[11px] text-neutral-500">{l.fixture} · {l.market}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-md bg-ink-950 px-1.5 py-0.5 text-xs font-black text-lime-pop">{l.odds.toFixed(2)}</span>
              <button onClick={() => slip.remove(l.selectionId)} aria-label="remove"><Trash2 size={14} className="text-neutral-400 hover:text-red-600" /></button>
            </div>
          </div>
        ))}
        {slip.count > 1 && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 text-[13px] font-bold">
            <button onClick={() => setMode('single')} className={cn('rounded-lg py-1.5 text-ink-950', mode === 'single' ? 'bg-white shadow' : 'text-neutral-500')}>Singles</button>
            <button onClick={() => setMode('acc')} className={cn('rounded-lg py-1.5 text-ink-950', mode === 'acc' ? 'bg-white shadow' : 'text-neutral-500')}>Accumulator</button>
          </div>
        )}
        {slip.count > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-xl border border-neutral-200 px-3 py-2">
                <span className="text-sm font-bold text-neutral-400">$</span>
                <input value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" className="w-full bg-transparent px-1 text-sm font-black text-ink-950 outline-none" aria-label="Stake" />
              </div>
              <div className="flex gap-1">
                {['5', '10', '25'].map((v) => <button key={v} onClick={() => setStake(v)} className="rounded-lg bg-neutral-100 px-2 py-2 text-xs font-bold text-ink-950 hover:bg-neutral-200">${v}</button>)}
              </div>
            </div>
            <div className="flex justify-between text-[13px] font-bold"><span className="text-neutral-500">Total odds</span><span className="text-ink-950">{slip.combinedOdds.toFixed(2)}</span></div>
            <div className="flex justify-between text-[13px] font-bold"><span className="text-neutral-500">Potential win</span><span className="text-brand-700">${win.toFixed(2)}</span></div>
            {msg && <p role="alert" className="rounded-lg bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700">{msg}</p>}
            {place.error && <p role="alert" className="rounded-lg bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700">{String(place.error)}</p>}
            <button disabled={place.pending} onClick={() => { setMsg(null); place.run() }} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-black text-white hover:bg-brand-500 disabled:opacity-60">
              {place.pending ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Placing…</span> : `Place bet · $${(parseFloat(stake || '0') || 0).toFixed(2)}`}
            </button>
            <p className="text-center text-[11px] text-neutral-400">Settles automatically on result · Cash-out available</p>
          </>
        )}
      </div>
    </aside>
  )
}

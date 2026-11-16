import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { myWallet, myTransactions, depositStripe, withdrawRequest } from '@/server/sportsbook'
import { useAction } from '@/lib/actions'
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

export const Route = createFileRoute('/wallet')({
  loader: async () => {
    try {
      const [w, tx] = await Promise.all([myWallet(), myTransactions()])
      return { wallet: w, tx }
    } catch { return { wallet: null, tx: [] as unknown[] } }
  },
  component: WalletPage,
})

function WalletPage() {
  const loaded = Route.useLoaderData() as { wallet: { balanceCents: number; bonusCents: number } | null; tx: { id: string; kind: string; amountCents: number; status: string; createdAt: string }[] }
  const [amount, setAmount] = useState('1000')
  const [demoCredited, setDemoCredited] = useState(false)
  const [wdDone, setWdDone] = useState(false)
  const deposit = useAction((amt: number) => depositStripe({ data: { amountCents: amt } }), {
    onSuccess: (r) => { const v = r as unknown as { url: string | null; demo?: boolean }; if (v.demo) setDemoCredited(true); if (v.url) window.location.href = v.url },
  })
  const withdraw = useAction((amt: number) => withdrawRequest({ data: { amountCents: amt } }), { onSuccess: () => setWdDone(true) })

  if (!loaded.wallet) return <main className="mx-auto max-w-lg px-4 pt-10 text-center"><Wallet size={32} className="mx-auto text-neutral-300" /><h1 className="mt-2 font-display text-xl font-bold">Sign in to open your wallet</h1><a href="/login" className="mt-3 inline-block rounded-xl bg-ink-950 px-5 py-2.5 font-semibold text-white">Sign in</a></main>

  return (
    <main className="mx-auto w-full max-w-3xl px-3 pt-4">
      <h1 className="font-display text-2xl font-bold text-ink-950">Wallet</h1>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ink-950 p-4 text-white"><p className="text-xs uppercase tracking-wider text-white/60">Cash balance</p><p className="font-display text-3xl font-bold tabular-nums">₦{(loaded.wallet.balanceCents / 100).toLocaleString()}</p></div>
        <div className="rounded-2xl bg-brand-500 p-4 text-ink-950"><p className="text-xs uppercase tracking-wider font-bold">Bonus</p><p className="font-display text-3xl font-bold tabular-nums">₦{(loaded.wallet.bonusCents / 100).toLocaleString()}</p></div>
      </div>
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="font-bold">Top up with card (Stripe)</h2>
        <div className="mt-2 flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Amount in naira" className="w-36 rounded-xl border border-neutral-300 px-3 py-2.5" />
          <button onClick={() => deposit.run(Math.round(Number(amount || '0') * 100))} disabled={deposit.pending} className="flex items-center gap-1.5 rounded-xl bg-brand-400 px-4 py-2.5 font-bold text-ink-950 hover:bg-brand-300"><ArrowDownToLine size={16} /> {deposit.pending ? 'Opening Stripe…' : 'Deposit'}</button>
          <button onClick={() => withdraw.run(Math.round(Number(amount || '0') * 100))} disabled={withdraw.pending} className="flex items-center gap-1.5 rounded-xl border border-neutral-300 px-4 py-2.5 font-semibold hover:bg-neutral-50"><ArrowUpFromLine size={16} /> Withdraw</button>
        </div>
        {deposit.error && <p role="alert" className="mt-2 text-sm text-red-600">{deposit.error}</p>}
        {withdraw.error && <p role="alert" className="mt-2 text-sm text-red-600">{withdraw.error}</p>}
        {demoCredited && <p className="mt-2 text-sm text-emerald-700">Demo top-up credited — connect Stripe in Backend → Cloud → Connectors to take live cards.</p>}
        {wdDone ? <p className="mt-2 text-sm text-emerald-700">Withdrawal request recorded — check Transactions below.</p> : null}
      </section>
      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="font-bold">Transactions</h2>
        <ul className="mt-2 divide-y divide-neutral-100 text-sm">
          {loaded.tx.length === 0 && <li className="py-3 text-neutral-500">No transactions yet.</li>}
          {loaded.tx.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2"><span className="capitalize">{t.kind.replace('_', ' ')} · <span className="text-neutral-400">{t.status}</span></span><span className={`font-bold tabular-nums ${t.amountCents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{t.amountCents >= 0 ? '+' : ''}₦{(t.amountCents / 100).toLocaleString()}</span></li>
          ))}
        </ul>
      </section>
    </main>
  )
}

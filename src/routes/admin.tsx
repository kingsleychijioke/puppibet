import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { adminOverview, adminCreateMatch, adminUpdateOdds, adminSettle, adminAdjustWallet, adminResolveTx, adminUpsertPromo, adminSaveContent } from '@/server/sportsbook'
import { useAction } from '@/lib/actions'
import { ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  loader: async () => {
    try { return await adminOverview() } catch { return null }
  },
  component: AdminPage,
})

function AdminPage() {
  const data = Route.useLoaderData() as null | {
    matches: { id: string; sport: string; league: string; homeTeam: string; awayTeam: string; startsAt: string; status: string }[]
    users: { id: string; name: string; email: string; role: string; balanceCents: number; bonusCents: number }[]
    tx: { id: string; userId: string; kind: string; amountCents: number; status: string; createdAt: string }[]
    promos: { id: string; code: string; title: string; bonusCents: number; active: number }[]
  }
  const [tab, setTab] = useState<'matches' | 'users' | 'payments' | 'promos' | 'content'>('matches')
  const [form, setForm] = useState({ sport: 'Football', league: 'Premier League', homeTeam: '', awayTeam: '', startsAt: '', homeOdds: '1.85', drawOdds: '3.40', awayOdds: '4.20' })
  const create = useAction(() => adminCreateMatch({ data: { ...form, homeOdds: Number(form.homeOdds), drawOdds: Number(form.drawOdds), awayOdds: Number(form.awayOdds) } }), {})
  const settle = useAction((p: { id: string; homeScore: number; awayScore: number }) => adminSettle({ data: p }), {})
  const odds = useAction((p: { matchId: string; label: string; odds: number }) => adminUpdateOdds({ data: p }), {})
  const adjust = useAction((p: { userId: string; amountCents: number; reason: string }) => adminAdjustWallet({ data: p }), {})
  const resolve = useAction((p: { id: string; status: string }) => adminResolveTx({ data: p }), {})
  const promo = useAction((p: { code: string; title: string; bonusCents: number }) => adminUpsertPromo({ data: p }), {})
  const content = useAction((p: { key: string; value: string }) => adminSaveContent({ data: p }), {})

  if (!data) return <main className="mx-auto max-w-lg px-4 pt-10 text-center"><ShieldCheck size={32} className="mx-auto text-neutral-300" /><h1 className="mt-2 font-display text-xl font-bold">Admin only</h1><p className="text-sm text-neutral-500">Sign in as an admin to manage Puppibet. First account can be promoted in the database.</p><a href="/login" className="mt-3 inline-block rounded-xl bg-ink-950 px-5 py-2.5 font-semibold text-white">Sign in</a></main>

  return (
    <main className="mx-auto w-full max-w-6xl px-3 pt-4 pb-16">
      <h1 className="font-display text-2xl font-bold text-ink-950">Puppibet Admin</h1>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {(['matches', 'users', 'payments', 'promos', 'content'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${tab === t ? 'bg-ink-950 text-white' : 'bg-white border border-neutral-200'}`}>{t}</button>
        ))}
      </div>

      {tab === 'matches' && (
        <section className="mt-3 grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form onSubmit={(e) => { e.preventDefault(); create.run() }} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
            <h2 className="font-bold">Create match</h2>
            {[['sport', 'Sport'], ['league', 'League'], ['homeTeam', 'Home team'], ['awayTeam', 'Away team'], ['startsAt', 'Starts at (ISO)']].map(([k, label]) => (
              <div key={k} className="mt-2"><label className="text-xs font-semibold uppercase text-neutral-500">{label}</label><input value={(form as Record<string, string>)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-0.5 w-full rounded-xl border border-neutral-300 px-3 py-2" /></div>
            ))}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['homeOdds', 'drawOdds', 'awayOdds'] as const).map((k) => <div key={k}><label className="text-xs font-semibold">{k}</label><input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full rounded-xl border border-neutral-300 px-2 py-2" /></div>)}
            </div>
            <button className="mt-3 w-full rounded-xl bg-brand-400 py-2.5 font-bold text-ink-950">Create</button>
            {create.error && <p role="alert" className="mt-1 text-xs text-red-600">{create.error}</p>}
          </form>
          <div className="space-y-2">
            {data.matches.slice(0, 40).map((m) => (
              <article key={m.id} className="rounded-2xl border border-neutral-200 bg-white p-3 text-sm">
                <p className="font-semibold">{m.homeTeam} vs {m.awayTeam} <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{m.status}</span></p>
                <p className="text-xs text-neutral-500">{m.sport} · {m.league}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SettleButtons id={m.id} run={(h, a) => settle.run({ id: m.id, homeScore: h, awayScore: a })} />
                  <button onClick={() => odds.run({ matchId: m.id, label: '1', odds: 2.1 })} className="rounded-lg border px-2 py-1 text-xs">Bump 1 → 2.10</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === 'users' && (
        <section className="mt-3 space-y-2">
          {data.users.map((u) => (
            <article key={u.id} className="rounded-2xl border border-neutral-200 bg-white p-3 text-sm">
              <p className="font-semibold">{u.name} · {u.email} <span className="ml-1 text-xs text-neutral-500">{u.role}</span></p>
              <p className="text-xs tabular-nums">Cash ₦{(u.balanceCents / 100).toLocaleString()} · Bonus ₦{(u.bonusCents / 100).toLocaleString()}</p>
              <AdjustRow userId={u.id} run={(amt, reason) => adjust.run({ userId: u.id, amountCents: amt, reason })} />
            </article>
          ))}
        </section>
      )}
      {tab === 'payments' && (
        <section className="mt-3 space-y-2">
          {data.tx.map((t) => (
            <article key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3 text-sm">
              <span>{t.kind} · ₦{(t.amountCents / 100).toLocaleString()} · {t.status}</span>
              {t.status === 'pending' && (
                <span className="flex gap-1.5">
                  <button onClick={() => resolve.run({ id: t.id, status: 'completed' })} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">Approve</button>
                  <button onClick={() => resolve.run({ id: t.id, status: 'failed' })} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Reject</button>
                </span>
              )}
            </article>
          ))}
        </section>
      )}
      {tab === 'promos' && (
        <PromoForm promos={data.promos} save={(code, title, bonus) => promo.run({ code, title, bonusCents: bonus })} />
      )}
      {tab === 'content' && (
        <ContentForm save={(key, value) => content.run({ key, value })} />
      )}
    </main>
  )
}

function SettleButtons({ id, run }: { id: string; run: (h: number, a: number) => void }) {
  const [h, setH] = useState('2'); const [a, setA] = useState('1')
  return <span className="flex items-center gap-1"><input aria-label={`Home score ${id}`} value={h} onChange={(e) => setH(e.target.value)} className="w-12 rounded-lg border px-2 py-1" />-<input aria-label={`Away score ${id}`} value={a} onChange={(e) => setA(e.target.value)} className="w-12 rounded-lg border px-2 py-1" /><button onClick={() => run(Number(h), Number(a))} className="rounded-lg bg-ink-950 px-2 py-1 text-xs font-bold text-white">Settle</button></span>
}
function AdjustRow({ userId, run }: { userId: string; run: (amt: number, reason: string) => void }) {
  const [amt, setAmt] = useState('5000'); const [reason, setReason] = useState('Bonus adjustment')
  return <span className="mt-2 flex flex-wrap gap-1.5"><input aria-label={`Amount ${userId}`} value={amt} onChange={(e) => setAmt(e.target.value)} className="w-24 rounded-lg border px-2 py-1" /><input aria-label={`Reason ${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="min-w-40 flex-1 rounded-lg border px-2 py-1" /><button onClick={() => run(Math.round(Number(amt) * 100), reason)} className="rounded-lg bg-ink-950 px-3 py-1 text-xs font-bold text-white">Adjust</button></span>
}
function PromoForm({ promos, save }: { promos: { id: string; code: string; title: string; bonusCents: number; active: number }[]; save: (c: string, t: string, b: number) => void }) {
  const [code, setCode] = useState(''); const [title, setTitle] = useState(''); const [bonus, setBonus] = useState('10000')
  return (
    <section className="mt-3 grid gap-3 lg:grid-cols-2">
      <form onSubmit={(e) => { e.preventDefault(); save(code, title, Math.round(Number(bonus) * 100)) }} className="rounded-2xl border bg-white p-4 text-sm">
        <h2 className="font-bold">Create / update promo</h2>
        <input placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 uppercase" />
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
        <input placeholder="Bonus in naira" value={bonus} onChange={(e) => setBonus(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
        <button className="mt-2 w-full rounded-xl bg-ink-950 py-2.5 font-bold text-white">Save promo</button>
      </form>
      <div className="space-y-2">{promos.map((p) => <p key={p.id} className="rounded-2xl border bg-white p-3 text-sm"><b>{p.code}</b> — {p.title} · ₦{(p.bonusCents / 100).toLocaleString()}</p>)}</div>
    </section>
  )
}
function ContentForm({ save }: { save: (k: string, v: string) => void }) {
  const [key, setKey] = useState('hero_title'); const [value, setValue] = useState('')
  return <form onSubmit={(e) => { e.preventDefault(); save(key, value) }} className="mt-3 rounded-2xl border bg-white p-4 text-sm"><h2 className="font-bold">Homepage content</h2><input aria-label="Content key" value={key} onChange={(e) => setKey(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" /><textarea aria-label="Content value" value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border px-3 py-2" /><button className="mt-2 rounded-xl bg-ink-950 px-4 py-2 font-bold text-white">Save</button></form>
}

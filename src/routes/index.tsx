import { createFileRoute, Link } from '@tanstack/react-router'
import { getBrowseData, listPromos } from '@/server/sportsbook'
import { SportsSidebar, MatchCard, OddsButton, SectionTitle } from '@/components/site'
import { BetslipPanel } from '@/components/betslip-panel'
import { Zap, Trophy, Plane, Dices, ChevronRight, Gift } from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [browse, promos] = await Promise.all([
      getBrowseData(),
      listPromos().catch(() => []),
    ])
    return { browse, promos }
  },
  component: Home,
})

function Home() {
  const { browse, promos } = Route.useLoaderData()
  const matches = browse.matches ?? []
  const sports = browse.sports ?? []
  const live = matches.filter((m) => m.status === 'live').slice(0, 4)
  const featured = (matches.filter((m) => m.featured).length ? matches.filter((m) => m.featured) : matches).slice(0, 8)
  const jackpot = matches.filter((m) => m.jackpotTag).slice(0, 6)

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 pt-4 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:px-4">
      <SportsSidebar sports={sports} />
      <div className="min-w-0 space-y-4">
        <section className="relative overflow-hidden rounded-2xl bg-ink-950 p-5 text-white sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-32 size-56 rounded-full bg-lime-pop/20 blur-3xl" />
          <p className="inline-flex items-center gap-1.5 rounded-full bg-lime-pop px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-ink-950"><Zap size={12} /> Puppibet · Advance SportBet</p>
          <h1 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight sm:text-5xl">{browse.content.hero_title || 'Bet bold. Win bigger.'}</h1>
          <p className="mt-2 max-w-lg text-sm text-white/70 sm:text-base">{browse.content.hero_sub || 'Best odds across football, basketball, tennis & more — plus Aviator, Jackpots and instant cash-out.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/sports" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white hover:bg-brand-500">Bet now</Link>
            <Link to="/jackpot" className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-black text-white hover:bg-white/20">{browse.content.hero_cta || 'Claim 100% welcome bonus up to $100'}</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[12px] font-bold text-white/60">
            <span>⚡ Instant cash-out</span><span>🎯 12 sports + live</span><span>✈️ Aviator &amp; virtuals</span>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { t: 'Live now', s: `${matches.filter((m) => m.status === 'live').length} matches`, to: '/live' as const, icon: <Zap size={16} />, c: 'bg-red-600' },
            { t: 'Jackpot', s: '$25,000 pool', to: '/jackpot' as const, icon: <Trophy size={16} />, c: 'bg-amber-500' },
            { t: 'Aviator', s: 'Crash & win', to: '/aviator' as const, icon: <Plane size={16} />, c: 'bg-sky-600' },
            { t: 'Virtuals', s: 'Every 2 min', to: '/virtuals' as const, icon: <Dices size={16} />, c: 'bg-violet-600' },
          ].map((c) => (
            <Link key={c.t} to={c.to} className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${c.c}`}>{c.icon}</span>
              <span className="min-w-0"><b className="block truncate text-[13px] text-ink-950">{c.t}</b><span className="block truncate text-[11px] text-neutral-500">{c.s}</span></span>
            </Link>
          ))}
        </div>

        {live.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-white">
            <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-white">
              <b className="flex items-center gap-2 text-sm"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-white" /></span> Live in-play</b>
              <Link to="/live" className="flex items-center gap-1 text-xs font-bold text-white">View all <ChevronRight size={14} /></Link>
            </div>
            <div className="divide-y divide-neutral-100">
              {live.map((m) => <MatchCard key={m.id} m={m as never} live />)}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <SectionTitle title="Featured matches" link="/sports" linkLabel="All sports" />
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {featured.map((m) => <MatchCard key={m.id} m={m as never} />)}
          </div>
        </section>

        {jackpot.length > 0 && (
          <section className="overflow-hidden rounded-2xl bg-ink-950 p-4 text-white">
            <div className="flex items-center justify-between">
              <b className="flex items-center gap-2 text-sm text-amber-300"><Trophy size={16} /> Midweek Jackpot · $25,000</b>
              <Link to="/jackpot" className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-black text-ink-950">Play $1</Link>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {jackpot.slice(0, 3).map((m) => (
                <div key={m.id} className="rounded-xl bg-white/10 p-2 text-center">
                  <p className="truncate text-[11px] font-bold text-white">{m.homeTeam} v {m.awayTeam}</p>
                  <div className="mt-1.5 flex justify-center gap-1">
                    {m.selections.filter((s) => s.market === '1X2').slice(0, 3).map((o) => (
                      <OddsButton key={o.id} label={o.label} odds={o.odds100 / 100} fixture={`${m.homeTeam} v ${m.awayTeam}`} matchId={m.id} selectionId={o.id} market="Jackpot" small />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {promos.length > 0 && (
          <section className="space-y-2">
            <SectionTitle title="Promotions" link="/me" linkLabel="My bonuses" />
            <div className="grid gap-2 sm:grid-cols-2">
              {promos.slice(0, 2).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50 p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white"><Gift size={18} /></span>
                  <div className="min-w-0"><b className="block truncate text-sm text-ink-950">{p.title}</b><p className="truncate text-xs text-neutral-500">{p.description} · Code {p.code}</p></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="hidden min-w-0 lg:block"><BetslipPanel compact /></div>
    </main>
  )
}

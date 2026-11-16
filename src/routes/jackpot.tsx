import { createFileRoute } from '@tanstack/react-router'
import { getJackpot } from '@/server/sportsbook'
import { OddsButton, SectionTitle } from '@/components/site'
import { BetslipPanel } from '@/components/betslip-panel'
import { Trophy } from 'lucide-react'

export const Route = createFileRoute('/jackpot')({
  loader: () => getJackpot(),
  component: JackpotPage,
})

type JMatch = { id: string; homeTeam: string; awayTeam: string; league: string; startsAt: string; odds: { id: string; market: string; label: string; odds: number }[] }

function JackpotPage() {
  const data = Route.useLoaderData() as { week: string; prizeCents: number; entryFeeCents: number; matches: JMatch[] }
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-4">
      <div className="min-w-0 space-y-3">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-ink-950 via-ink-900 to-brand-700 p-6 text-white">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider"><Trophy size={13} /> Weekly Jackpot · {data.week}</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">₦{(data.prizeCents / 100).toLocaleString()} Jackpot</h1>
          <p className="mt-1 text-sm text-white/70">Pick 1X2 on all {data.matches.length} games. Entry ₦{(data.entryFeeCents / 100).toLocaleString()}.</p>
        </div>
        {data.matches.map((m, i) => (
          <section key={m.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <SectionTitle title={`Game ${i + 1} · ${m.league} — ${m.homeTeam} vs ${m.awayTeam}`} />
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(m.odds ?? []).filter((o) => o.market === '1X2').map((o) => <OddsButton key={o.id} label={o.label} odds={o.odds} fixture={`${m.homeTeam} v ${m.awayTeam}`} matchId={m.id} selectionId={o.id} market="Jackpot 1X2" />)}
            </div>
          </section>
        ))}
      </div>
      <div className="min-w-0"><BetslipPanel compact /></div>
    </main>
  )
}

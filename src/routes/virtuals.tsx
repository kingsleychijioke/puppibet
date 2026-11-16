import { createFileRoute } from '@tanstack/react-router'
import { listMatches } from '@/server/sportsbook'
import { OddsButton, SectionTitle } from '@/components/site'
import { BetslipPanel } from '@/components/betslip-panel'

export const Route = createFileRoute('/virtuals')({
  loader: () => listMatches({ data: { sport: 'Virtuals' } }),
  component: VirtualsPage,
})

type VMatch = { id: string; homeTeam: string; awayTeam: string; league: string; startsAt: string; odds: { id: string; market: string; label: string; odds: number }[] }

function VirtualsPage() {
  const raw = Route.useLoaderData() as VMatch[] | { matches: VMatch[] }
  const matches: VMatch[] = Array.isArray(raw) ? raw : (raw as { matches: VMatch[] }).matches ?? []
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-ink-950">Virtuals</h1>
        <p className="text-sm text-neutral-500">New round every 2 minutes — bet the 1X2 like a real match.</p>
        <div className="mt-3 space-y-3">
          {matches.map((m) => (
            <section key={m.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <SectionTitle title={`${m.league} · ${m.homeTeam} vs ${m.awayTeam}`} />
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(m.odds ?? []).filter((o) => o.market === '1X2').map((o) => <OddsButton key={o.id} label={o.label} odds={o.odds} fixture={`${m.homeTeam} v ${m.awayTeam}`} matchId={m.id} selectionId={o.id} market="1X2" />)}
              </div>
            </section>
          ))}
          {matches.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">No virtual rounds right now — check back soon.</p>}
        </div>
      </div>
      <div className="min-w-0"><BetslipPanel compact /></div>
    </main>
  )
}

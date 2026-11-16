import { createFileRoute } from '@tanstack/react-router'
import { getMatchDetail } from '@/server/sportsbook'
import { OddsButton, SectionTitle } from '@/components/site'
import { BetslipPanel } from '@/components/betslip-panel'
import { dateFmt } from '@/lib/format'

export const Route = createFileRoute('/matches/$id')({
  loader: ({ params }) => getMatchDetail({ data: { id: params.id } }),
  component: Detail,
})

function Detail() {
  const { match: m, selections } = Route.useLoaderData()
  const groups = [...new Set(selections.map((s) => s.market))]
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{m.sport} · {m.league}</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-950">{m.homeTeam} vs {m.awayTeam}</h1>
        <p className="text-sm text-neutral-500">{dateFmt(m.startsAt)} · {m.status}{m.status === 'live' ? ` · ${m.minute}'` : ''}</p>
        <div className="mt-3 space-y-3">
          {groups.map((g) => (
            <section key={g} className="rounded-2xl border border-neutral-200 bg-white p-3">
              <SectionTitle title={g} />
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {selections.filter((s) => s.market === g).map((o) => (
                  <OddsButton key={o.id} label={o.label} odds={o.odds100 / 100} fixture={`${m.homeTeam} vs ${m.awayTeam}`} matchId={m.id} selectionId={o.id} market={o.market ?? g} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <div className="min-w-0"><BetslipPanel compact /></div>
    </main>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getBrowseData, tickLive } from '@/server/sportsbook'
import { useAction } from '@/lib/actions'
import { SectionTitle, MatchCard, SportsSidebar } from '@/components/site'
import { BetslipPanel } from '@/components/betslip-panel'
import { Zap } from 'lucide-react'

export const Route = createFileRoute('/live')({ loader: async () => getBrowseData(), component: Live })

function Live() {
  const data = Route.useLoaderData()
  const [filter, setFilter] = useState('All')
  const live = (data.matches ?? []).filter((m) => m.status === 'live')
  const shown = filter === 'All' ? live : live.filter((m) => m.sport === filter)
  const tick = useAction(() => tickLive(), {})
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 pt-4 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:px-4">
      <SportsSidebar sports={data.sports ?? []} active={filter} onPick={setFilter} />
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink-950"><span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE</span> {shown.length} in-play</h1>
          <button onClick={() => tick.run()} disabled={tick.pending} className="inline-flex items-center gap-1 rounded-full bg-ink-950 px-3 py-1.5 text-xs font-black text-white hover:bg-ink-900"><Zap size={12} /> {tick.pending ? 'Updating…' : 'Refresh odds'}</button>
        </div>
        {tick.error && <p role="alert" className="mt-2 text-sm text-red-600">{tick.error}</p>}
        <div className="mt-3 space-y-2">
          <SectionTitle title="In-play now" />
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {shown.map((m) => <MatchCard key={m.id} m={m as never} />)}
          </div>
          {shown.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">No live matches right now — check upcoming fixtures.</p>}
        </div>
      </div>
      <div className="hidden min-w-0 lg:block"><BetslipPanel compact /></div>
    </main>
  )
}

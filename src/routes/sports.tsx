import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getBrowseData } from '@/server/sportsbook'
import { SportsSidebar, MatchCard, SectionTitle } from '@/components/site'
import { BetslipPanel } from '@/components/betslip-panel'

export const Route = createFileRoute('/sports')({ loader: async () => getBrowseData(), component: Sports })

function Sports() {
  const data = Route.useLoaderData()
  const matches = data.matches ?? []
  const sports = data.sports ?? []
  const [q, setQ] = useState('')
  const [sport, setSport] = useState('All')
  const list = matches.filter(
    (m) => (sport === 'All' || m.sport === sport) && (!q || `${m.homeTeam} ${m.awayTeam} ${m.league}`.toLowerCase().includes(q.toLowerCase())),
  )
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 pt-4 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:px-4">
      <SportsSidebar sports={sports} active={sport} onPick={setSport} />
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold text-ink-950">All sports</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams, leagues…" className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none placeholder:text-neutral-400 focus:border-brand-500" aria-label="Search matches" />
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {['All', ...sports].map((s) => (
            <button key={s} onClick={() => setSport(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${sport === s ? 'bg-ink-950 text-white' : 'bg-white text-neutral-500 ring-1 ring-neutral-200'}`}>{s}</button>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          <SectionTitle title={`${list.length} matches`} />
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {list.slice(0, 60).map((m) => <MatchCard key={m.id} m={m as never} />)}
            {list.length === 0 && <p className="p-6 text-center text-sm text-neutral-500">No matches found. <Link to="/" className="font-bold text-brand-700">Back home</Link></p>}
          </div>
        </div>
      </div>
      <div className="hidden min-w-0 lg:block"><BetslipPanel compact /></div>
    </main>
  )
}

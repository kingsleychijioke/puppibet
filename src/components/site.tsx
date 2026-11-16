import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useSlip } from '@/lib/betslip'
import { cn } from '@/lib/utils'
import { Dog, Menu, X, Wallet, Star, Trash2, Ticket } from 'lucide-react'

export const SPORTS = [
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'rugby', label: 'Rugby', icon: '🏉' },
  { id: 'ice-hockey', label: 'Ice Hockey', icon: '🏒' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'handball', label: 'Handball', icon: '🤾' },
  { id: 'baseball', label: 'Baseball', icon: '⚾' },
  { id: 'mma', label: 'MMA', icon: '🥊' },
  { id: 'table-tennis', label: 'Table Tennis', icon: '🏓' },
  { id: 'darts', label: 'Darts', icon: '🎯' },
]

export type MatchWithSels = {
  id: string
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  startsAt: string
  status: string
  homeScore: number
  awayScore: number
  minute: number
  featured?: boolean | number | null
  jackpotTag?: string | null
  selections: Array<{ id: string; matchId: string; market: string; label: string; odds100: number; live?: boolean | number | null }>
}

function NavLink({ to, label, live }: { to: string; label: string; live?: boolean }) {
  return (
    <Link
      to={to as never}
      activeProps={{ className: 'bg-white text-ink-950' }}
      className="rounded-full px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white"
    >
      <span className="inline-flex items-center gap-1.5">
        {live && <span className="size-1.5 animate-pulse rounded-full bg-red-400" />}
        {label}
      </span>
    </Link>
  )
}

function SlipBadge() {
  const slip = useSlip()
  if (slip.count === 0) return null
  return (
    <a href="#betslip" className="flex items-center gap-1 rounded-full bg-lime-pop px-3 py-1.5 text-xs font-black text-ink-950">
      <Ticket size={13} /> {slip.count}
    </a>
  )
}

export function TopBar() {
  const [open, setOpen] = useState(false)
  const { data: session } = authClient.useSession()
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-ink-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:px-4">
          <button className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-lime-pop text-ink-950">
              <Dog size={22} strokeWidth={2.5} />
            </span>
            <span className="font-display text-xl font-black tracking-tight text-white">
              Puppi<span className="text-lime-pop">bet</span>
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 text-sm font-semibold lg:flex">
            <NavLink to="/" label="Sports" />
            <NavLink to="/live" label="Live" live />
            <NavLink to="/jackpot" label="Jackpot" />
            <NavLink to="/aviator" label="Aviator" />
            <NavLink to="/virtuals" label="Virtuals" />
            <NavLink to="/me" label="My Bets" />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session?.user ? (
              <>
                <Link to="/wallet" className="hidden items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-brand-500 sm:flex">
                  <Wallet size={15} /> Deposit
                </Link>
                <Link to="/me" className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-black text-ink-950">
                  {(session.user.name || 'P').slice(0, 1).toUpperCase()}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3.5 py-1.5 text-sm font-bold text-white/90 hover:text-white">Log in</Link>
                <Link to="/signup" className="rounded-full bg-lime-pop px-4 py-1.5 text-sm font-black text-ink-950 hover:brightness-110">Join</Link>
              </>
            )}
            <SlipBadge />
          </div>
        </div>
      </div>
      <div className="border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-1.5 text-[13px] font-semibold">
          <Link to="/" className="flex shrink-0 items-center gap-1 rounded-full bg-ink-950 px-3 py-1 text-white">
            <Star size={13} /> Featured
          </Link>
          {SPORTS.map((s) => (
            <Link key={s.id} to="/sports" search={{ sport: s.id } as never} className="shrink-0 rounded-full px-3 py-1 text-neutral-700 hover:bg-neutral-100">
              <span className="mr-1">{s.icon}</span>{s.label}
            </Link>
          ))}
          <Link to="/live" className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 font-bold text-red-600">
            <span className="size-1.5 animate-pulse rounded-full bg-red-600" /> Live
          </Link>
        </div>
      </div>
      {open && (
        <div className="border-b border-white/10 bg-ink-950 px-4 py-3 text-white lg:hidden">
          <div className="grid grid-cols-2 gap-1 text-sm font-bold">
            {[
              { to: '/', label: 'Sports' },
              { to: '/live', label: 'Live' },
              { to: '/jackpot', label: 'Jackpot' },
              { to: '/aviator', label: 'Aviator' },
              { to: '/virtuals', label: 'Virtuals' },
              { to: '/me', label: 'My Bets' },
              { to: '/wallet', label: 'Wallet' },
              { to: '/admin', label: 'Admin' },
            ].map((l) => (
              <Link key={l.to + l.label} to={l.to as never} onClick={() => setOpen(false)} className="rounded-xl bg-white/10 px-3 py-2.5 text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-10 border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm sm:grid-cols-4">
        <div>
          <p className="font-display text-lg font-black text-ink-950">Puppibet</p>
          <p className="mt-1 text-neutral-500">Advanced sportsbook: 12 sports, live in-play, jackpot pools, Aviator crash &amp; virtuals. 18+ only. Bet responsibly.</p>
        </div>
        <div>
          <b className="text-ink-950">Betting</b>
          <div className="mt-2 flex flex-col gap-1.5 text-neutral-600">
            <Link to="/live" className="hover:text-ink-950">Live betting</Link>
            <Link to="/jackpot" className="hover:text-ink-950">Jackpot</Link>
            <Link to="/aviator" className="hover:text-ink-950">Aviator</Link>
            <Link to="/virtuals" className="hover:text-ink-950">Virtuals</Link>
          </div>
        </div>
        <div>
          <b className="text-ink-950">Account</b>
          <div className="mt-2 flex flex-col gap-1.5 text-neutral-600">
            <Link to="/wallet" className="hover:text-ink-950">Wallet</Link>
            <Link to="/me" className="hover:text-ink-950">My bets</Link>
            <Link to="/login" className="hover:text-ink-950">Log in</Link>
          </div>
        </div>
        <div>
          <b className="text-ink-950">Trust</b>
          <p className="mt-2 text-neutral-600">Secure payments via Stripe<br />Instant cash-out<br />Bonuses &amp; promos</p>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-4 text-center text-xs text-neutral-400">© 2026 Puppibet. Demo sportsbook — fixtures are simulated for demonstration. 18+. BeGambleAware.</div>
    </footer>
  )
}

export function BottomNav() {
  return (
    <>
      <div className="h-14 lg:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white/95 px-2 py-2 text-[11px] font-bold text-neutral-600 backdrop-blur lg:hidden">
        {[
          { to: '/', label: 'Sports' },
          { to: '/live', label: 'Live' },
          { to: '/aviator', label: 'Games' },
          { to: '/jackpot', label: 'Jackpot' },
          { to: '/me', label: 'Bets' },
        ].map((l) => (
          <Link key={l.label} to={l.to as never} className="rounded-lg py-1 text-center hover:bg-neutral-100">
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

export function SectionTitle({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-lg font-black text-ink-950">{title}</h2>
      {link ? <Link to={link as never} className="text-xs font-bold text-brand-700 hover:underline">{linkLabel ?? 'View all'}</Link> : null}
    </div>
  )
}

export function SportsSidebar({ sports, active, onPick }: { sports: string[]; active?: string; onPick?: (s: string) => void }) {
  return (
    <aside className="hidden min-w-0 lg:block">
      <div className="sticky top-32 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <p className="bg-ink-950 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white">Sports</p>
        <div className="max-h-[70vh] overflow-auto p-1.5">
          {onPick ? (
            <button onClick={() => onPick('All')} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold', !active || active === 'All' ? 'bg-lime-pop/30 text-ink-950' : 'text-neutral-700 hover:bg-neutral-100')}>
              <Star size={14} /> All sports
            </button>
          ) : (
          <Link to="/sports" className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold', !active ? 'bg-lime-pop/30 text-ink-950' : 'text-neutral-700 hover:bg-neutral-100')}>
            <Star size={14} /> All sports
          </Link>
          )}
          {SPORTS.filter((s) => sports.length === 0 || sports.includes(s.id)).map((s) => (
            onPick ? (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold', active === s.id ? 'bg-lime-pop/30 text-ink-950' : 'text-neutral-700 hover:bg-neutral-100')}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ) : (
            <Link
              key={s.id}
              to="/sports"
              search={{ sport: s.id } as never}
              className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold', active === s.id ? 'bg-lime-pop/30 text-ink-950' : 'text-neutral-700 hover:bg-neutral-100')}
            >
              <span>{s.icon}</span> {s.label}
            </Link>
            )
          ))}
        </div>
      </div>
    </aside>
  )
}

export function OddsButton({
  matchId, selectionId, label, odds, fixture, market, sport, small,
}: {
  matchId: string; selectionId: string; label: string; odds: number; fixture: string; market: string; sport?: string; small?: boolean
}) {
  const slip = useSlip()
  const selected = slip.has(selectionId)
  return (
    <button
      onClick={() => slip.toggle({ matchId, selectionId, label, odds, fixture, market, sport: sport ?? '' })}
      className={cn(
        'rounded-lg font-black tabular-nums transition',
        small ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        selected ? 'bg-lime-pop text-ink-950 shadow' : 'bg-ink-950 text-lime-pop hover:bg-ink-900',
      )}
      aria-pressed={selected}
    >
      <span className="mr-1 opacity-60">{label}</span>{odds.toFixed(2)}
    </button>
  )
}

export function MatchCard({ m, live }: { m: MatchWithSels; live?: boolean }) {
  const main = m.selections.filter((s) => s.market === '1X2').slice(0, 3)
  const isLive = live || m.status === 'live'
  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          {isLive && <span className="mr-1 font-black text-red-600">{m.minute}&prime;</span>}
          {m.league} · {m.sport}
        </p>
        <Link to="/matches/$id" params={{ id: m.id } as never} className="block truncate text-[13px] font-bold text-ink-950 hover:underline">
          {m.homeTeam} vs {m.awayTeam}
        </Link>
        <p className="text-[11px] text-neutral-500">
          {isLive ? <span className="font-black text-ink-950">{m.homeScore} - {m.awayScore}</span> : new Date(m.startsAt).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {main.map((s) => (
          <OddsButton
            key={s.id}
            matchId={m.id}
            selectionId={s.id}
            label={s.label}
            odds={s.odds100 / 100}
            fixture={`${m.homeTeam} vs ${m.awayTeam}`}
            market={s.market}
          />
        ))}
      </div>
    </div>
  )
}

export function ClearSlipButton() {
  const slip = useSlip()
  if (slip.count === 0) return null
  return (
    <button onClick={slip.clear} className="inline-flex items-center gap-1 text-[11px] font-bold text-white/60 hover:text-white">
      <Trash2 size={12} /> Clear all
    </button>
  )
}

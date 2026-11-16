import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type SlipLeg = {
  selectionId: string
  matchId: string
  label: string
  market: string
  odds: number
  fixture: string
  sport?: string
}

type SlipCtx = {
  legs: SlipLeg[]
  toggle: (leg: SlipLeg) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  count: number
  combinedOdds: number
}

const Ctx = createContext<SlipCtx | null>(null)
const KEY = 'puppibet-slip-v1'

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<SlipLeg[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setLegs(JSON.parse(raw))
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(KEY, JSON.stringify(legs)) } catch {}
    }
  }, [legs, ready])

  const toggle = useCallback((leg: SlipLeg) => {
    setLegs((prev) => {
      if (prev.some((l) => l.selectionId === leg.selectionId)) return prev.filter((l) => l.selectionId !== leg.selectionId)
      // one pick per match for sanity (like SportyBet)
      const withoutMatch = prev.filter((l) => l.matchId !== leg.matchId)
      return [...withoutMatch, leg]
    })
  }, [])

  const remove = useCallback((id: string) => setLegs((p) => p.filter((l) => l.selectionId !== id)), [])
  const clear = useCallback(() => setLegs([]), [])
  const has = useCallback((id: string) => legs.some((l) => l.selectionId === id), [legs])
  const combinedOdds = useMemo(() => legs.reduce((a, l) => a * l.odds, legs.length ? 1 : 0), [legs])

  const value = useMemo(() => ({ legs, toggle, remove, clear, has, count: legs.length, combinedOdds }), [legs, toggle, remove, clear, has, combinedOdds])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSlip() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSlip outside provider')
  return v
}

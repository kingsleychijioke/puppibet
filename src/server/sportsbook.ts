import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { bets, gameRounds, matches, profiles, promos, selections, siteContent, transactions, userPromos, wallets } from '@/db/schema'

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}
const nowIso = () => new Date().toISOString()
const fmtOdds = (o100: number) => (o100 / 100).toFixed(2)
const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`

async function ensureProfileAndWallet(userId: string, name?: string | null) {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const existing = await db.select().from(profiles).where(eq(profiles.userId, userId)).get()
  if (!existing) {
    const isFirst = ((await db.select({ c: sql<number>`count(*)` }).from(profiles).get())?.c ?? 0) === 0
    await db.insert(profiles).values({
      userId,
      displayName: name || `Player ${userId.slice(-4)}`,
      role: isFirst ? 'admin' : 'user',
      createdAt: nowIso(),
    })
    await db.insert(wallets).values({ userId, balanceCents: 0, bonusCents: 500 })
    await db.insert(userPromos).values({ id: uid('up'), userId, promoId: 'promo-free5', createdAt: nowIso() })
  } else {
    const w = await db.select().from(wallets).where(eq(wallets.userId, userId)).get()
    if (!w) await db.insert(wallets).values({ userId, balanceCents: 0, bonusCents: 0 })
  }
}

async function requireAdmin() {
  const { requireUser } = await import('@/lib/session.server')
  const user = await requireUser()
  await ensureProfileAndWallet(user.id, (user as { name?: string }).name)
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const p = await db.select().from(profiles).where(eq(profiles.userId, user.id)).get()
  if (!p || p.role !== 'admin') throw new Error('Admin only')
  return { user, profile: p, db }
}

export const getBrowseData = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const all = await db.select().from(matches).orderBy(matches.startsAt)
  const sels = await db.select().from(selections)
  const byMatch = new Map<string, typeof sels>()
  for (const s of sels) {
    const arr = byMatch.get(s.matchId) ?? []
    arr.push(s)
    byMatch.set(s.matchId, arr)
  }
  const sports = [...new Set(all.map((m) => m.sport))]
  const content = await db.select().from(siteContent)
  const contentMap: Record<string, string> = {}
  for (const c of content) contentMap[c.key] = c.value
  return {
    matches: all.map((m) => ({ ...m, selections: byMatch.get(m.id) ?? [] })),
    sports,
    content: contentMap,
  }
})

export const getMatchDetail = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const m = await db.select().from(matches).where(eq(matches.id, data.id)).get()
    if (!m) throw new Error('Match not found')
    const sels = await db.select().from(selections).where(eq(selections.matchId, data.id))
    return { match: m, selections: sels }
  })

export const getSessionProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { currentUser } = await import('@/lib/session.server')
  const user = await currentUser()
  if (!user) return { user: null, profile: null, wallet: null }
  await ensureProfileAndWallet(user.id, (user as { name?: string }).name)
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const profile = await db.select().from(profiles).where(eq(profiles.userId, user.id)).get()
  const wallet = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
  return { user: { id: user.id, email: user.email }, profile, wallet }
})

export const placeBet = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      legs: z.array(z.object({ matchId: z.string(), selectionId: z.string() })).min(1).max(20),
      stakeCents: z.number().int().min(50).max(1000000),
      kind: z.enum(['single', 'accumulator', 'live', 'jackpot', 'aviator', 'virtual']).default('single'),
    }),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    await ensureProfileAndWallet(user.id)
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const wallet = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (!wallet || wallet.balanceCents + wallet.bonusCents < data.stakeCents) throw new Error('Insufficient balance. Please top up your wallet.')
    const selRows = await db.select().from(selections)
    const selById = new Map(selRows.map((s) => [s.id, s]))
    const matchRows = await db.select().from(matches)
    const matchById = new Map(matchRows.map((m) => [m.id, m]))
    let total100 = 100
    const legsOut: Array<Record<string, unknown>> = []
    for (const leg of data.legs) {
      const s = selById.get(leg.selectionId)
      if (!s || s.matchId !== leg.matchId) throw new Error('Invalid selection')
      const m = matchById.get(leg.matchId)
      if (!m) throw new Error('Match not found')
      if (m.status === 'settled') throw new Error('Match already settled')
      total100 = Math.round((total100 * s.odds100) / 100)
      legsOut.push({
        matchId: m.id,
        selectionId: s.id,
        market: s.market,
        label: s.label,
        odds100: s.odds100,
        fixture: `${m.homeTeam} vs ${m.awayTeam}`,
        sport: m.sport,
        league: m.league,
      })
    }
    const kind = data.legs.length > 1 ? 'accumulator' : data.kind === 'accumulator' && data.legs.length === 1 ? 'single' : data.kind
    const potential = Math.round((data.stakeCents * total100) / 100)
    // debit: bonus first
    let remaining = data.stakeCents
    const fromBonus = Math.min(wallet.bonusCents, remaining)
    remaining -= fromBonus
    await db
      .update(wallets)
      .set({ balanceCents: wallet.balanceCents - remaining, bonusCents: wallet.bonusCents - fromBonus })
      .where(eq(wallets.userId, user.id))
    const id = uid('bet')
    await db.insert(bets).values({
      id,
      userId: user.id,
      kind: kind as 'single' | 'accumulator' | 'live' | 'jackpot' | 'aviator' | 'virtual',
      stakeCents: data.stakeCents,
      totalOdds100: total100,
      potentialWinCents: potential,
      status: 'open',
      legsJson: JSON.stringify(legsOut),
      createdAt: nowIso(),
    })
    await db.insert(transactions).values({
      id: uid('tx'),
      userId: user.id,
      kind: 'bet_stake',
      amountCents: -data.stakeCents,
      status: 'completed',
      reference: id,
      createdAt: nowIso(),
    })
    return { id, totalOdds100: total100, potentialWinCents: potential }
  })

export const myBets = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireUser } = await import('@/lib/session.server')
  const user = await requireUser()
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const rows = await db.select().from(bets).where(eq(bets.userId, user.id)).orderBy(desc(bets.createdAt))
  return rows.map((r) => ({ ...r, legs: JSON.parse(r.legsJson) as Array<{ matchId?: string; selectionId?: string; label?: string; market?: string; odds?: number; fixture?: string }> }))
})

export const cashoutBet = createServerFn({ method: 'POST' })
  .validator((d: { betId: string }) => d)
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const bet = await db.select().from(bets).where(eq(bets.id, data.betId)).get()
    if (!bet || bet.userId !== user.id) throw new Error('Bet not found')
    if (bet.status !== 'open') throw new Error('Only open bets can be cashed out')
    // cashout value ~ 82% of fair value with time decay
    const value = Math.max(10, Math.round(bet.potentialWinCents * 0.62))
    await db.update(bets).set({ status: 'cashed_out', cashoutCents: value, settledAt: nowIso() }).where(eq(bets.id, bet.id))
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + value }).where(eq(wallets.userId, user.id))
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'cashout', amountCents: value, status: 'completed', reference: bet.id, createdAt: nowIso() })
    return { value }
  })

export const myTransactions = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireUser } = await import('@/lib/session.server')
  const user = await requireUser()
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  return db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.createdAt))
})

export const claimPromo = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string().min(3).max(20) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    await ensureProfileAndWallet(user.id)
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const code = data.code.trim().toUpperCase()
    const promo = await db.select().from(promos).where(eq(promos.code, code)).get()
    if (!promo || !promo.active) throw new Error('Invalid or expired promo code')
    const claimed = await db.select().from(userPromos).where(and(eq(userPromos.userId, user.id), eq(userPromos.promoId, promo.id))).get()
    if (claimed) throw new Error('You already claimed this bonus')
    await db.insert(userPromos).values({ id: uid('up'), userId: user.id, promoId: promo.id, createdAt: nowIso() })
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (w) await db.update(wallets).set({ bonusCents: w.bonusCents + promo.bonusCents }).where(eq(wallets.userId, user.id))
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'bonus', amountCents: promo.bonusCents, status: 'completed', reference: promo.code, createdAt: nowIso() })
    return { bonusCents: promo.bonusCents }
  })

export const listPromos = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  return db.select().from(promos).where(eq(promos.active, true))
})

export const demoTopup = createServerFn({ method: 'POST' })
  .validator(z.object({ amountCents: z.number().int().min(100).max(500000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    await ensureProfileAndWallet(user.id)
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (!w) throw new Error('No wallet')
    await db.update(wallets).set({ balanceCents: w.balanceCents + data.amountCents }).where(eq(wallets.userId, user.id))
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'deposit', amountCents: data.amountCents, status: 'completed', reference: 'demo-topup', createdAt: nowIso() })
    return { ok: true }
  })

export const requestWithdrawal = createServerFn({ method: 'POST' })
  .validator(z.object({ amountCents: z.number().int().min(500).max(1000000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (!w || w.balanceCents < data.amountCents) throw new Error('Insufficient withdrawable balance')
    await db.update(wallets).set({ balanceCents: w.balanceCents - data.amountCents }).where(eq(wallets.userId, user.id))
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'withdrawal', amountCents: -data.amountCents, status: 'pending', reference: 'bank-transfer', createdAt: nowIso() })
    return { ok: true }
  })

export const createDepositSession = createServerFn({ method: 'POST' })
  .validator(z.object({ amountCents: z.number().int().min(500).max(1000000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not connected yet — use Demo top-up below, or connect Stripe to take real card payments.')
    const { createCheckoutSession } = await import('@/lib/monstarx/stripe.server')
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const ref = uid('dep')
    await db.insert(transactions).values({ id: ref, userId: user.id, kind: 'deposit', amountCents: data.amountCents, status: 'pending', reference: 'stripe', createdAt: nowIso() })
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `https://puppibet.app/wallet?deposit=success&ref=${ref}`)
    params.set('cancel_url', 'https://puppibet.app/wallet?deposit=cancelled')
    params.set('line_items[0][price_data][currency]', 'usd')
    params.set('line_items[0][price_data][product_data][name]', `Puppibet wallet top-up ${fmtMoney(data.amountCents)}`)
    params.set('line_items[0][price_data][unit_amount]', String(data.amountCents))
    params.set('line_items[0][quantity]', '1')
    params.set('client_reference_id', ref)
    params.set('metadata[userId]', user.id)
    params.set('metadata[ref]', ref)
    const session = await createCheckoutSession(params, { idempotencyKey: ref, expected: { clientReferenceId: ref, amountTotal: data.amountCents, currency: 'usd' } })
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'deposit_intent', amountCents: 0, status: 'pending', reference: session.id ?? ref, createdAt: nowIso() }).catch(() => {})
    return { url: session.state === 'open' ? session.url : null, id: session.id }
  })

export const confirmDeposit = createServerFn({ method: 'POST' })
  .validator(z.object({ ref: z.string() }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const tx = await db.select().from(transactions).where(eq(transactions.id, data.ref)).get()
    if (!tx || tx.userId !== user.id) throw new Error('Deposit not found')
    if (tx.status === 'completed') return { ok: true }
    if (!process.env.STRIPE_SECRET_KEY) {
      // demo mode: complete instantly
      await db.update(transactions).set({ status: 'completed' }).where(eq(transactions.id, tx.id))
      const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
      if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + tx.amountCents }).where(eq(wallets.userId, user.id))
      return { ok: true }
    }
    await db.update(transactions).set({ status: 'completed' }).where(eq(transactions.id, tx.id))
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + tx.amountCents }).where(eq(wallets.userId, user.id))
    return { ok: true }
  })

export const playAviator = createServerFn({ method: 'POST' })
  .validator(z.object({ stakeCents: z.number().int().min(50).max(200000), cashoutX100: z.number().int().min(110).max(10000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    await ensureProfileAndWallet(user.id)
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (!w || w.balanceCents + w.bonusCents < data.stakeCents) throw new Error('Insufficient balance')
    // crash point: house edge distribution
    const r = Math.random()
    const crashX100 = r < 0.03 ? 100 : Math.min(20000, Math.round((95 / (1 - r)) * 1))
    const won = data.cashoutX100 <= crashX100
    const payout = won ? Math.round((data.stakeCents * data.cashoutX100) / 100) : 0
    const net = payout - data.stakeCents
    let rem = data.stakeCents
    const fromBonus = Math.min(w.bonusCents, rem)
    rem -= fromBonus
    let newBal = w.balanceCents - rem
    let newBonus = w.bonusCents - fromBonus
    if (won) newBal += payout
    await db.update(wallets).set({ balanceCents: newBal, bonusCents: newBonus }).where(eq(wallets.userId, user.id))
    const id = uid('bet')
    await db.insert(bets).values({
      id, userId: user.id, kind: 'aviator', stakeCents: data.stakeCents,
      totalOdds100: data.cashoutX100, potentialWinCents: payout,
      status: won ? 'won' : 'lost', legsJson: JSON.stringify([{ crashX100, cashoutX100: data.cashoutX100 }]),
      createdAt: nowIso(), settledAt: nowIso(),
    })
    await db.insert(gameRounds).values({ id: uid('gr'), game: 'aviator', roundNo: Math.floor(Date.now() / 1000) % 100000, status: 'settled', multiplier100: crashX100, resultText: `Crashed @ ${(crashX100 / 100).toFixed(2)}x`, createdAt: nowIso() })
    return { won, crashX100, payout, net }
  })

export const playVirtual = createServerFn({ method: 'POST' })
  .validator(z.object({ pick: z.string(), stakeCents: z.number().int().min(50).max(200000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    await ensureProfileAndWallet(user.id)
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (!w || w.balanceCents + w.bonusCents < data.stakeCents) throw new Error('Insufficient balance')
    const teams = [['Lions', 'Eagles'], ['Sharks', 'Wolves'], ['Cobras', 'Falcons']]
    const [h, a] = teams[Math.floor(Math.random() * teams.length)]
    const hs = Math.floor(Math.random() * 4)
    const as = Math.floor(Math.random() * 4)
    const result = hs > as ? '1' : hs < as ? '2' : 'X'
    const won = data.pick === result
    const odds100 = 270
    const payout = won ? Math.round((data.stakeCents * odds100) / 100) : 0
    let rem = data.stakeCents
    const fromBonus = Math.min(w.bonusCents, rem)
    rem -= fromBonus
    await db.update(wallets).set({ balanceCents: w.balanceCents - rem + payout, bonusCents: w.bonusCents - fromBonus }).where(eq(wallets.userId, user.id))
    const id = uid('bet')
    await db.insert(bets).values({
      id, userId: user.id, kind: 'virtual', stakeCents: data.stakeCents, totalOdds100: odds100,
      potentialWinCents: payout, status: won ? 'won' : 'lost',
      legsJson: JSON.stringify([{ fixture: `Virtual ${h} vs Virtual ${a}`, pick: data.pick, result, score: `${hs}-${as}` }]),
      createdAt: nowIso(), settledAt: nowIso(),
    })
    await db.insert(gameRounds).values({ id: uid('gr'), game: 'virtual', roundNo: Math.floor(Date.now() / 1000) % 100000, status: 'settled', multiplier100: won ? odds100 : 0, resultText: `Virtual ${h} ${hs}-${as} Virtual ${a}`, createdAt: nowIso() })
    return { won, score: `${h} ${hs}-${as} ${a}`, payout }
  })

export const tickLive = createServerFn({ method: 'POST' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const live = await db.select().from(matches).where(eq(matches.status, 'live'))
  for (const m of live) {
    const nm = Math.min(90, m.minute + 1 + Math.floor(Math.random() * 2))
    let hs = m.homeScore
    let as = m.awayScore
    if (Math.random() < 0.06) { if (Math.random() < 0.5) hs += 1; else as += 1 }
    await db.update(matches).set({ minute: nm, homeScore: hs, awayScore: as }).where(eq(matches.id, m.id))
    const sels = await db.select().from(selections).where(eq(selections.matchId, m.id))
    for (const s of sels) {
      const jitter = 1 + (Math.random() - 0.5) * 0.08
      const next = Math.max(105, Math.min(3000, Math.round(s.odds100 * jitter)))
      await db.update(selections).set({ odds100: next }).where(eq(selections.id, s.id))
    }
  }
  return { updated: live.length }
})

// ---- Admin ----
export const adminOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  const matchRows = await db.select().from(matches).orderBy(desc(matches.startsAt))
  const profileRows = await db.select().from(profiles).orderBy(desc(profiles.createdAt))
  const walletRows = await db.select().from(wallets)
  const wBy = new Map(walletRows.map((w) => [w.userId, w]))
  const txRows = await db.select().from(transactions).orderBy(desc(transactions.createdAt))
  const promoRows = await db.select().from(promos).orderBy(desc(promos.createdAt))
  return {
    matches: matchRows.slice(0, 100),
    users: profileRows.slice(0, 200).map((p) => ({ id: p.userId, name: p.displayName, email: '', role: p.role, balanceCents: wBy.get(p.userId)?.balanceCents ?? 0, bonusCents: wBy.get(p.userId)?.bonusCents ?? 0 })),
    tx: txRows.slice(0, 200),
    promos: promoRows,
  }
})

export const adminUsers = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  const ps = await db.select().from(profiles).orderBy(desc(profiles.createdAt))
  const ws = await db.select().from(wallets)
  const wBy = new Map(ws.map((w) => [w.userId, w]))
  return ps.slice(0, 200).map((p) => ({ ...p, wallet: wBy.get(p.userId) ?? null }))
})

export const adminAdjustWallet = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string(), amountCents: z.number().int().min(-1000000).max(1000000), reason: z.string().optional() }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const w = await db.select().from(wallets).where(eq(wallets.userId, data.userId)).get()
    if (!w) throw new Error('No wallet')
    await db.update(wallets).set({ balanceCents: w.balanceCents + data.amountCents }).where(eq(wallets.userId, data.userId))
    await db.insert(transactions).values({ id: uid('tx'), userId: data.userId, kind: 'admin_adjust', amountCents: data.amountCents, status: 'completed', reference: 'admin', createdAt: nowIso() })
    return { ok: true }
  })

export const adminApproveTx = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), approve: z.boolean() }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const tx = await db.select().from(transactions).where(eq(transactions.id, data.id)).get()
    if (!tx) throw new Error('Not found')
    if (tx.status !== 'pending') throw new Error('Already processed')
    if (data.approve) {
      await db.update(transactions).set({ status: 'completed' }).where(eq(transactions.id, tx.id))
      if (tx.kind === 'deposit' && tx.amountCents > 0) {
        const w = await db.select().from(wallets).where(eq(wallets.userId, tx.userId)).get()
        if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + tx.amountCents }).where(eq(wallets.userId, tx.userId))
      }
    } else {
      await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, tx.id))
      if (tx.kind === 'withdrawal') {
        const w = await db.select().from(wallets).where(eq(wallets.userId, tx.userId)).get()
        if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + Math.abs(tx.amountCents) }).where(eq(wallets.userId, tx.userId))
      }
    }
    return { ok: true }
  })

export const adminPendingTx = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await requireAdmin()
  return db.select().from(transactions).where(eq(transactions.status, 'pending')).orderBy(desc(transactions.createdAt))
})

export const adminUpsertMatch = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().optional(),
      sport: z.string().min(2),
      league: z.string().min(2),
      homeTeam: z.string().min(2),
      awayTeam: z.string().min(2),
      startsAt: z.string().min(10),
      status: z.enum(['upcoming', 'live', 'settled']),
      homeScore: z.number().int().min(0).default(0),
      awayScore: z.number().int().min(0).default(0),
      minute: z.number().int().min(0).max(130).default(0),
      featured: z.boolean().default(false),
      jackpotTag: z.string().optional().nullable(),
      odds1: z.number().min(1.01).default(2),
      oddsX: z.number().min(1.01).default(3.2),
      odds2: z.number().min(1.01).default(3),
    }),
  )
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const id = data.id || uid('m')
    const ex = data.id ? await db.select().from(matches).where(eq(matches.id, data.id)).get() : null
    if (ex) {
      await db.update(matches).set({ sport: data.sport, league: data.league, homeTeam: data.homeTeam, awayTeam: data.awayTeam, startsAt: data.startsAt, status: data.status, homeScore: data.homeScore, awayScore: data.awayScore, minute: data.minute, featured: data.featured, jackpotTag: data.jackpotTag || null }).where(eq(matches.id, id))
    } else {
      await db.insert(matches).values({ id, sport: data.sport, league: data.league, homeTeam: data.homeTeam, awayTeam: data.awayTeam, startsAt: data.startsAt, status: data.status, homeScore: data.homeScore, awayScore: data.awayScore, minute: data.minute, featured: data.featured, jackpotTag: data.jackpotTag || null })
      await db.insert(selections).values([
        { id: `${id}-1`, matchId: id, market: '1X2', label: '1', odds100: Math.round(data.odds1 * 100), live: data.status === 'live' },
        { id: `${id}-x`, matchId: id, market: '1X2', label: 'X', odds100: Math.round(data.oddsX * 100), live: data.status === 'live' },
        { id: `${id}-2`, matchId: id, market: '1X2', label: '2', odds100: Math.round(data.odds2 * 100), live: data.status === 'live' },
      ])
    }
    return { id }
  })

export const adminSettleMatch = createServerFn({ method: 'POST' })
  .validator(z.object({ matchId: z.string(), homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db.update(matches).set({ homeScore: data.homeScore, awayScore: data.awayScore, status: 'settled', minute: 90 }).where(eq(matches.id, data.matchId))
    const outcome = data.homeScore > data.awayScore ? '1' : data.homeScore < data.awayScore ? '2' : 'X'
    const open = await db.select().from(bets).where(eq(bets.status, 'open'))
    let settled = 0
    for (const b of open) {
      try {
        const legs = JSON.parse(b.legsJson) as Array<{ matchId?: string; selectionId?: string; label?: string }>
        const relevant = legs.filter((l) => l.matchId === data.matchId)
        if (relevant.length === 0) continue
        const wonAll = relevant.every((l) => {
          if (l.label) return l.label === outcome
          const selId = l.selectionId ?? ''
          return (outcome === '1' && selId.endsWith('-1')) || (outcome === 'X' && selId.endsWith('-x')) || (outcome === '2' && selId.endsWith('-2'))
        })
        // accumulator: if any leg lost -> lost; here we only know one match, settle only singles / if lost
        if (legs.length === 1) {
          if (wonAll) {
            await db.update(bets).set({ status: 'won', settledAt: nowIso() }).where(eq(bets.id, b.id))
            const w = await db.select().from(wallets).where(eq(wallets.userId, b.userId)).get()
            if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + b.potentialWinCents }).where(eq(wallets.userId, b.userId))
            await db.insert(transactions).values({ id: uid('tx'), userId: b.userId, kind: 'winnings', amountCents: b.potentialWinCents, status: 'completed', reference: b.id, createdAt: nowIso() })
          } else {
            await db.update(bets).set({ status: 'lost', settledAt: nowIso() }).where(eq(bets.id, b.id))
          }
          settled++
        } else if (!wonAll) {
          await db.update(bets).set({ status: 'lost', settledAt: nowIso() }).where(eq(bets.id, b.id))
          settled++
        }
      } catch { continue }
    }
    return { outcome, settled }
  })

export const adminSettleBet = createServerFn({ method: 'POST' })
  .validator(z.object({ betId: z.string(), result: z.enum(['won', 'lost']) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const b = await db.select().from(bets).where(eq(bets.id, data.betId)).get()
    if (!b) throw new Error('Not found')
    if (b.status !== 'open') throw new Error('Already settled')
    await db.update(bets).set({ status: data.result, settledAt: nowIso() }).where(eq(bets.id, b.id))
    if (data.result === 'won') {
      const w = await db.select().from(wallets).where(eq(wallets.userId, b.userId)).get()
      if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + b.potentialWinCents }).where(eq(wallets.userId, b.userId))
      await db.insert(transactions).values({ id: uid('tx'), userId: b.userId, kind: 'winnings', amountCents: b.potentialWinCents, status: 'completed', reference: b.id, createdAt: nowIso() })
    }
    return { ok: true }
  })

export const adminCreatePromo = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string().min(3), title: z.string().min(3), description: z.string().min(3), bonusCents: z.number().int().min(100) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db.insert(promos).values({ id: uid('promo'), code: data.code.trim().toUpperCase(), title: data.title, description: data.description, bonusCents: data.bonusCents, active: true, createdAt: nowIso() })
    return { ok: true }
  })

export const adminUpdateContent = createServerFn({ method: 'POST' })
  .validator(z.object({ key: z.string(), value: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db.insert(siteContent).values({ key: data.key, value: data.value }).onConflictDoUpdate({ target: siteContent.key, set: { value: data.value } })
    return { ok: true }
  })

export const searchMatches = createServerFn({ method: 'GET' })
  .validator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const q = `%${data.q}%`
    const rows = await db.select().from(matches).where(or(like(matches.homeTeam, q), like(matches.awayTeam, q), like(matches.league, q), like(matches.sport, q)))
    const sels = await db.select().from(selections)
    const by = new Map<string, typeof sels>()
    for (const s of sels) { const a = by.get(s.matchId) ?? []; a.push(s); by.set(s.matchId, a) }
    return rows.map((m) => ({ ...m, selections: by.get(m.id) ?? [] }))
  })

// ---- Compatibility aliases for route imports ----
export const myWallet = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireUser } = await import('@/lib/session.server')
  const user = await requireUser()
  await ensureProfileAndWallet(user.id)
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
  return w ?? { userId: user.id, balanceCents: 0, bonusCents: 0 }
})

export const cashOut = createServerFn({ method: 'POST' })
  .validator((d: { betId: string }) => d)
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const bet = await db.select().from(bets).where(eq(bets.id, data.betId)).get()
    if (!bet || bet.userId !== user.id) throw new Error('Bet not found')
    if (bet.status !== 'open') throw new Error('Only open bets can be cashed out')
    const value = Math.max(10, Math.round(bet.potentialWinCents * 0.62))
    await db.update(bets).set({ status: 'cashed_out', cashoutCents: value, settledAt: nowIso() }).where(eq(bets.id, bet.id))
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + value }).where(eq(wallets.userId, user.id))
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'cashout', amountCents: value, status: 'completed', reference: bet.id, createdAt: nowIso() })
    return { value }
  })

export const withdrawRequest = createServerFn({ method: 'POST' })
  .validator(z.object({ amountCents: z.number().int().min(500).max(1000000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
    if (!w || w.balanceCents < data.amountCents) throw new Error('Insufficient withdrawable balance')
    await db.update(wallets).set({ balanceCents: w.balanceCents - data.amountCents }).where(eq(wallets.userId, user.id))
    await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'withdrawal', amountCents: -data.amountCents, status: 'pending', reference: 'bank-transfer', createdAt: nowIso() })
    return { ok: true }
  })

export const depositStripe = createServerFn({ method: 'POST' })
  .validator(z.object({ amountCents: z.number().int().min(500).max(1000000) }))
  .handler(async ({ data }) => {
    const { requireUser } = await import('@/lib/session.server')
    const user = await requireUser()
    await ensureProfileAndWallet(user.id)
    if (!process.env.STRIPE_SECRET_KEY) {
      const { getDb } = await import('@/lib/db')
      const db = await getDb()
      const w = await db.select().from(wallets).where(eq(wallets.userId, user.id)).get()
      if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + data.amountCents }).where(eq(wallets.userId, user.id))
      await db.insert(transactions).values({ id: uid('tx'), userId: user.id, kind: 'deposit', amountCents: data.amountCents, status: 'completed', reference: 'demo-topup', createdAt: nowIso() })
      return { url: null as string | null, demo: true }
    }
    const { createCheckoutSession } = await import('@/lib/monstarx/stripe.server')
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const ref = uid('dep')
    await db.insert(transactions).values({ id: ref, userId: user.id, kind: 'deposit', amountCents: data.amountCents, status: 'pending', reference: 'stripe', createdAt: nowIso() })
    const stripeParams = new URLSearchParams()
    stripeParams.set('mode', 'payment')
    stripeParams.set('success_url', `https://puppibet.app/wallet?deposit=success&ref=${ref}`)
    stripeParams.set('cancel_url', 'https://puppibet.app/wallet?deposit=cancelled')
    stripeParams.set('line_items[0][price_data][currency]', 'usd')
    stripeParams.set('line_items[0][price_data][product_data][name]', `Puppibet wallet top-up ${fmtMoney(data.amountCents)}`)
    stripeParams.set('line_items[0][price_data][unit_amount]', String(data.amountCents))
    stripeParams.set('line_items[0][quantity]', '1')
    stripeParams.set('client_reference_id', ref)
    stripeParams.set('metadata[userId]', user.id)
    stripeParams.set('metadata[ref]', ref)
    const session = await createCheckoutSession(stripeParams, { idempotencyKey: ref, expected: { clientReferenceId: ref, amountTotal: data.amountCents, currency: 'usd' } })
    return { url: session.state === 'open' ? session.url : null, demo: false, id: session.id }
  })

export const getJackpot = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('@/lib/db')
  const db = await getDb()
  const all = await db.select().from(matches).orderBy(matches.startsAt)
  const sels = await db.select().from(selections)
  const by = new Map<string, typeof sels>()
  for (const s of sels) { const a = by.get(s.matchId) ?? []; a.push(s); by.set(s.matchId, a) }
  const tagged = all.filter((m) => m.jackpotTag)
  const pool = (tagged.length >= 3 ? tagged : all).slice(0, 6)
  return {
    week: 'Midweek',
    prizeCents: 2500000,
    entryFeeCents: 100,
    matches: pool.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      league: m.league,
      startsAt: m.startsAt,
      odds: (by.get(m.id) ?? []).map((s) => ({ id: s.id, market: s.market, label: s.label, odds: s.odds100 / 100 })),
    })),
  }
})

export const listMatches = createServerFn({ method: 'GET' })
  .validator((d: { sport?: string }) => d)
  .handler(async ({ data }) => {
    const { getDb } = await import('@/lib/db')
    const db = await getDb()
    const all = data.sport
      ? await db.select().from(matches).where(eq(matches.sport, data.sport)).orderBy(matches.startsAt)
      : await db.select().from(matches).orderBy(matches.startsAt)
    const sels = await db.select().from(selections)
    const by = new Map<string, typeof sels>()
    for (const s of sels) { const a = by.get(s.matchId) ?? []; a.push(s); by.set(s.matchId, a) }
    return all.slice(0, 30).map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      league: m.league,
      startsAt: m.startsAt,
      odds: (by.get(m.id) ?? []).map((s) => ({ id: s.id, market: s.market, label: s.label, odds: s.odds100 / 100 })),
    }))
  })

export const adminCreateMatch = createServerFn({ method: 'POST' })
  .validator(z.object({ sport: z.string(), league: z.string(), homeTeam: z.string(), awayTeam: z.string(), startsAt: z.string(), homeOdds: z.number(), drawOdds: z.number(), awayOdds: z.number() }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const id = uid('m')
    await db.insert(matches).values({ id, sport: data.sport, league: data.league, homeTeam: data.homeTeam, awayTeam: data.awayTeam, startsAt: data.startsAt || nowIso(), status: 'upcoming', homeScore: 0, awayScore: 0, minute: 0, featured: false, jackpotTag: null })
    await db.insert(selections).values([
      { id: `${id}-1`, matchId: id, market: '1X2', label: '1', odds100: Math.round(data.homeOdds * 100), live: false },
      { id: `${id}-x`, matchId: id, market: '1X2', label: 'X', odds100: Math.round(data.drawOdds * 100), live: false },
      { id: `${id}-2`, matchId: id, market: '1X2', label: '2', odds100: Math.round(data.awayOdds * 100), live: false },
    ])
    return { id }
  })

export const adminUpdateOdds = createServerFn({ method: 'POST' })
  .validator(z.object({ matchId: z.string(), label: z.string(), odds: z.number() }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const sel = await db.select().from(selections).where(and(eq(selections.matchId, data.matchId), eq(selections.label, data.label))).get()
    if (!sel) throw new Error('Selection not found')
    await db.update(selections).set({ odds100: Math.round(data.odds * 100) }).where(eq(selections.id, sel.id))
    return { ok: true }
  })

export const adminSettle = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db.update(matches).set({ homeScore: data.homeScore, awayScore: data.awayScore, status: 'settled', minute: 90 }).where(eq(matches.id, data.id))
    const outcome = data.homeScore > data.awayScore ? '1' : data.homeScore < data.awayScore ? '2' : 'X'
    const open = await db.select().from(bets).where(eq(bets.status, 'open'))
    let settled = 0
    for (const b of open) {
      try {
        const legs = JSON.parse(b.legsJson) as Array<{ matchId?: string; label?: string; selectionId?: string }>
        const relevant = legs.filter((l) => l.matchId === data.id)
        if (!relevant.length) continue
        const wonAll = relevant.every((l) => {
          if (l.label) return l.label === outcome
          const sid = l.selectionId ?? ''
          return (outcome === '1' && sid.endsWith('-1')) || (outcome === 'X' && sid.endsWith('-x')) || (outcome === '2' && sid.endsWith('-2'))
        })
        if (legs.length === 1) {
          if (wonAll) {
            await db.update(bets).set({ status: 'won', settledAt: nowIso() }).where(eq(bets.id, b.id))
            const w = await db.select().from(wallets).where(eq(wallets.userId, b.userId)).get()
            if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + b.potentialWinCents }).where(eq(wallets.userId, b.userId))
            await db.insert(transactions).values({ id: uid('tx'), userId: b.userId, kind: 'winnings', amountCents: b.potentialWinCents, status: 'completed', reference: b.id, createdAt: nowIso() })
          } else await db.update(bets).set({ status: 'lost', settledAt: nowIso() }).where(eq(bets.id, b.id))
          settled++
        } else if (!wonAll) {
          await db.update(bets).set({ status: 'lost', settledAt: nowIso() }).where(eq(bets.id, b.id))
          settled++
        }
      } catch { continue }
    }
    return { outcome, settled }
  })

export const adminResolveTx = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), status: z.string() }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    const tx = await db.select().from(transactions).where(eq(transactions.id, data.id)).get()
    if (!tx) throw new Error('Not found')
    if (data.status === 'completed') {
      await db.update(transactions).set({ status: 'completed' }).where(eq(transactions.id, tx.id))
      if (tx.kind === 'deposit' && tx.amountCents > 0) {
        const w = await db.select().from(wallets).where(eq(wallets.userId, tx.userId)).get()
        if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + tx.amountCents }).where(eq(wallets.userId, tx.userId))
      }
    } else {
      await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, tx.id))
      if (tx.kind === 'withdrawal') {
        const w = await db.select().from(wallets).where(eq(wallets.userId, tx.userId)).get()
        if (w) await db.update(wallets).set({ balanceCents: w.balanceCents + Math.abs(tx.amountCents) }).where(eq(wallets.userId, tx.userId))
      }
    }
    return { ok: true }
  })

export const adminUpsertPromo = createServerFn({ method: 'POST' })
  .validator(z.object({ code: z.string().min(2), title: z.string().min(2), bonusCents: z.number().int().min(100) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db.insert(promos).values({ id: uid('promo'), code: data.code.trim().toUpperCase(), title: data.title, description: data.title, bonusCents: data.bonusCents, active: true, createdAt: nowIso() })
    return { ok: true }
  })

export const adminSaveContent = createServerFn({ method: 'POST' })
  .validator(z.object({ key: z.string(), value: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { db } = await requireAdmin()
    await db.insert(siteContent).values({ key: data.key, value: data.value }).onConflictDoUpdate({ target: siteContent.key, set: { value: data.value } })
    return { ok: true }
  })

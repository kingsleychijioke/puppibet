export * from './auth-schema'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().$type<'user' | 'admin'>(),
  createdAt: text('created_at').notNull(),
})

export const wallets = sqliteTable('wallets', {
  userId: text('user_id').primaryKey(),
  balanceCents: integer('balance_cents').notNull().default(0),
  bonusCents: integer('bonus_cents').notNull().default(0),
})

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  sport: text('sport').notNull(),
  league: text('league').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  startsAt: text('starts_at').notNull(),
  status: text('status').notNull().$type<'upcoming' | 'live' | 'settled'>(),
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),
  minute: integer('minute').notNull().default(0),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  jackpotTag: text('jackpot_tag'),
})

export const selections = sqliteTable('selections', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull(),
  market: text('market').notNull(),
  label: text('label').notNull(),
  odds100: integer('odds100').notNull(),
  live: integer('live', { mode: 'boolean' }).notNull().default(false),
})

export const bets = sqliteTable('bets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  kind: text('kind').notNull().$type<'single' | 'accumulator' | 'live' | 'jackpot' | 'aviator' | 'virtual'>(),
  stakeCents: integer('stake_cents').notNull(),
  totalOdds100: integer('total_odds100').notNull(),
  potentialWinCents: integer('potential_win_cents').notNull(),
  status: text('status').notNull().$type<'open' | 'won' | 'lost' | 'cashed_out' | 'pending'>(),
  cashoutCents: integer('cashout_cents'),
  legsJson: text('legs_json').notNull(),
  createdAt: text('created_at').notNull(),
  settledAt: text('settled_at'),
})

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  kind: text('kind').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: text('status').notNull().$type<'pending' | 'completed' | 'failed'>(),
  reference: text('reference'),
  createdAt: text('created_at').notNull(),
})

export const promos = sqliteTable('promos', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  bonusCents: integer('bonus_cents').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})

export const userPromos = sqliteTable('user_promos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  promoId: text('promo_id').notNull(),
  createdAt: text('created_at').notNull(),
})

export const siteContent = sqliteTable('site_content', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const gameRounds = sqliteTable('game_rounds', {
  id: text('id').primaryKey(),
  game: text('game').notNull(),
  roundNo: integer('round_no').notNull(),
  status: text('status').notNull(),
  multiplier100: integer('multiplier100').notNull(),
  resultText: text('result_text').notNull(),
  createdAt: text('created_at').notNull(),
})

export type Profile = typeof profiles.$inferSelect
export type MatchRow = typeof matches.$inferSelect
export type SelectionRow = typeof selections.$inferSelect
export type BetRow = typeof bets.$inferSelect

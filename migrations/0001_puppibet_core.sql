CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS wallets (user_id TEXT PRIMARY KEY, balance_cents INTEGER NOT NULL DEFAULT 0, bonus_cents INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, sport TEXT NOT NULL, league TEXT NOT NULL, home_team TEXT NOT NULL, away_team TEXT NOT NULL, starts_at TEXT NOT NULL, status TEXT NOT NULL, home_score INTEGER NOT NULL DEFAULT 0, away_score INTEGER NOT NULL DEFAULT 0, minute INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0, jackpot_tag TEXT);
CREATE TABLE IF NOT EXISTS selections (id TEXT PRIMARY KEY, match_id TEXT NOT NULL, market TEXT NOT NULL, label TEXT NOT NULL, odds100 INTEGER NOT NULL, live INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, stake_cents INTEGER NOT NULL, total_odds100 INTEGER NOT NULL, potential_win_cents INTEGER NOT NULL, status TEXT NOT NULL, cashout_cents INTEGER, legs_json TEXT NOT NULL, created_at TEXT NOT NULL, settled_at TEXT);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, amount_cents INTEGER NOT NULL, status TEXT NOT NULL, reference TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS promos (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL, bonus_cents INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_promos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, promo_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS site_content (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS game_rounds (id TEXT PRIMARY KEY, game TEXT NOT NULL, round_no INTEGER NOT NULL, status TEXT NOT NULL, multiplier100 INTEGER NOT NULL, result_text TEXT NOT NULL, created_at TEXT NOT NULL);
INSERT OR IGNORE INTO promos (id, code, title, description, bonus_cents, active, created_at) VALUES
('promo-welcome', 'PUPPI100', 'Welcome Bonus 100%', 'Claim 100% bonus up to $100 on your first deposit. Min deposit $10.', 10000, 1, '2026-01-01T00:00:00Z'),
('promo-accaboost', 'ACCA25', 'Accumulator Boost 25%', 'Get $25 free bet when you place a 5+ leg accumulator.', 2500, 1, '2026-01-01T00:00:00Z'),
('promo-free5', 'FREEBET5', '$5 Free Bet', 'Free $5 bet for all new Puppibet players. No deposit needed.', 500, 1, '2026-01-01T00:00:00Z');
INSERT OR IGNORE INTO site_content (key, value) VALUES
('hero_title', 'Bet Smart. Win Big. Cash Out Fast.'),
('hero_subtitle', 'Puppibet is the next-gen sportsbook: 10,000+ weekly markets, instant live odds, Aviator crash, virtuals and a massive weekend jackpot.'),
('announcement', 'WEEKEND JACKPOT: $250,000 pool — 15 correct picks wins big! Entries close Sunday 14:00.'),
('hero_cta', 'Join Puppibet & claim your 100% bonus');
INSERT OR IGNORE INTO matches (id, sport, league, home_team, away_team, starts_at, status, home_score, away_score, minute, featured, jackpot_tag) VALUES
('m-foot-01', 'Football', 'Premier League', 'Arsenal', 'Chelsea', '2026-11-03T19:30:00Z', 'upcoming', 0, 0, 0, 1, 'WEEKEND-JACKPOT'),
('m-foot-02', 'Football', 'La Liga', 'Real Madrid', 'Sevilla', '2026-11-03T20:00:00Z', 'upcoming', 0, 0, 0, 1, 'WEEKEND-JACKPOT'),
('m-foot-03', 'Football', 'Serie A', 'Inter', 'Napoli', '2026-11-02T18:45:00Z', 'live', 1, 1, 67, 1, 'WEEKEND-JACKPOT'),
('m-foot-04', 'Football', 'Bundesliga', 'Bayern Munich', 'Dortmund', '2026-11-04T18:30:00Z', 'upcoming', 0, 0, 0, 1, 'WEEKEND-JACKPOT'),
('m-foot-05', 'Football', 'Ligue 1', 'PSG', 'Marseille', '2026-11-02T20:00:00Z', 'live', 2, 0, 54, 1, 'WEEKEND-JACKPOT'),
('m-foot-06', 'Football', 'Nigeria NPFL', 'Enyimba', 'Rangers Int''l', '2026-11-03T15:00:00Z', 'upcoming', 0, 0, 0, 0, 'WEEKEND-JACKPOT'),
('m-foot-07', 'Football', 'Champions League', 'Man City', 'Bayern Munich', '2026-11-05T20:00:00Z', 'upcoming', 0, 0, 0, 1, 'WEEKEND-JACKPOT'),
('m-bask-01', 'Basketball', 'NBA', 'LA Lakers', 'Boston Celtics', '2026-11-03T02:00:00Z', 'upcoming', 0, 0, 0, 1, NULL),
('m-bask-02', 'Basketball', 'EuroLeague', 'Fenerbahce', 'Real Madrid BC', '2026-11-02T17:00:00Z', 'live', 68, 64, 32, 0, NULL),
('m-ten-01', 'Tennis', 'ATP Finals', 'C. Alcaraz', 'J. Sinner', '2026-11-03T14:00:00Z', 'upcoming', 0, 0, 0, 1, NULL),
('m-ten-02', 'Tennis', 'WTA Finals', 'I. Swiatek', 'C. Gauff', '2026-11-02T12:00:00Z', 'live', 1, 0, 0, 0, NULL),
('m-cric-01', 'Cricket', 'IPL T20', 'Mumbai Indians', 'Chennai Super Kings', '2026-11-04T14:00:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-rug-01', 'Rugby', 'Premiership', 'Saracens', 'Harlequins', '2026-11-03T16:00:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-hock-01', 'Ice Hockey', 'NHL', 'Edmonton Oilers', 'Toronto Maple Leafs', '2026-11-03T01:00:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-voll-01', 'Volleyball', 'World League', 'Brazil', 'Poland', '2026-11-03T18:00:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-tt-01', 'Table Tennis', 'WTT Cup', 'Fan Zhendong', 'Truls Moregardh', '2026-11-02T10:00:00Z', 'live', 2, 1, 0, 0, NULL),
('m-mma-01', 'MMA', 'UFC 312', 'D. Du Plessis', 'S. Strickland', '2026-11-08T03:00:00Z', 'upcoming', 0, 0, 0, 1, NULL),
('m-box-01', 'Boxing', 'Heavyweight Title', 'O. Usyk', 'T. Fury', '2026-12-20T22:00:00Z', 'upcoming', 0, 0, 0, 1, NULL),
('m-base-01', 'Baseball', 'MLB World Series', 'LA Dodgers', 'NY Yankees', '2026-11-03T00:30:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-amfb-01', 'American Football', 'NFL', 'Kansas City Chiefs', 'Buffalo Bills', '2026-11-04T00:15:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-dart-01', 'Darts', 'Premier League Darts', 'L. Littler', 'L. Humphries', '2026-11-05T19:00:00Z', 'upcoming', 0, 0, 0, 0, NULL),
('m-espo-01', 'eSports', 'CS2 Major', 'FaZe Clan', 'NAVI', '2026-11-02T16:00:00Z', 'live', 9, 7, 0, 0, NULL),
('m-foot-08', 'Football', 'Eredivisie', 'Ajax', 'PSV', '2026-11-03T16:30:00Z', 'upcoming', 0, 0, 0, 0, 'WEEKEND-JACKPOT'),
('m-foot-09', 'Football', 'Championship', 'Leeds United', 'Sunderland', '2026-11-04T19:45:00Z', 'upcoming', 0, 0, 0, 0, 'WEEKEND-JACKPOT');
INSERT OR IGNORE INTO selections (id, match_id, market, label, odds100, live) VALUES
('s-m-foot-01-1', 'm-foot-01', '1X2', '1', 210, 0),('s-m-foot-01-x', 'm-foot-01', '1X2', 'X', 340, 0),('s-m-foot-01-2', 'm-foot-01', '1X2', '2', 320, 0),('s-m-foot-01-o25', 'm-foot-01', 'Over/Under', 'Over 2.5', 195, 0),('s-m-foot-01-u25', 'm-foot-01', 'Over/Under', 'Under 2.5', 188, 0),('s-m-foot-01-btts', 'm-foot-01', 'BTTS', 'Yes', 175, 0),
('s-m-foot-02-1', 'm-foot-02', '1X2', '1', 165, 0),('s-m-foot-02-x', 'm-foot-02', '1X2', 'X', 390, 0),('s-m-foot-02-2', 'm-foot-02', '1X2', '2', 520, 0),('s-m-foot-02-o25', 'm-foot-02', 'Over/Under', 'Over 2.5', 180, 0),('s-m-foot-02-u25', 'm-foot-02', 'Over/Under', 'Under 2.5', 200, 0),
('s-m-foot-03-1', 'm-foot-03', '1X2', '1', 245, 1),('s-m-foot-03-x', 'm-foot-03', '1X2', 'X', 290, 1),('s-m-foot-03-2', 'm-foot-03', '1X2', '2', 310, 1),('s-m-foot-03-o25', 'm-foot-03', 'Over/Under', 'Over 2.5', 210, 1),('s-m-foot-03-u25', 'm-foot-03', 'Over/Under', 'Under 2.5', 172, 1),
('s-m-foot-04-1', 'm-foot-04', '1X2', '1', 175, 0),('s-m-foot-04-x', 'm-foot-04', '1X2', 'X', 380, 0),('s-m-foot-04-2', 'm-foot-04', '1X2', '2', 450, 0),('s-m-foot-04-o25', 'm-foot-04', 'Over/Under', 'Over 2.5', 170, 0),
('s-m-foot-05-1', 'm-foot-05', '1X2', '1', 145, 1),('s-m-foot-05-x', 'm-foot-05', '1X2', 'X', 480, 1),('s-m-foot-05-2', 'm-foot-05', '1X2', '2', 680, 1),
('s-m-foot-06-1', 'm-foot-06', '1X2', '1', 230, 0),('s-m-foot-06-x', 'm-foot-06', '1X2', 'X', 300, 0),('s-m-foot-06-2', 'm-foot-06', '1X2', '2', 310, 0),
('s-m-foot-07-1', 'm-foot-07', '1X2', '1', 250, 0),('s-m-foot-07-x', 'm-foot-07', '1X2', 'X', 340, 0),('s-m-foot-07-2', 'm-foot-07', '1X2', '2', 270, 0),
('s-m-bask-01-1', 'm-bask-01', 'Moneyline', '1', 185, 0),('s-m-bask-01-2', 'm-bask-01', 'Moneyline', '2', 195, 0),('s-m-bask-01-o', 'm-bask-01', 'Total', 'Over 224.5', 190, 0),('s-m-bask-01-u', 'm-bask-01', 'Total', 'Under 224.5', 190, 0),
('s-m-bask-02-1', 'm-bask-02', 'Moneyline', '1', 172, 1),('s-m-bask-02-2', 'm-bask-02', 'Moneyline', '2', 210, 1),
('s-m-ten-01-1', 'm-ten-01', 'Winner', 'Alcaraz', 180, 0),('s-m-ten-01-2', 'm-ten-01', 'Winner', 'Sinner', 200, 0),
('s-m-ten-02-1', 'm-ten-02', 'Winner', 'Swiatek', 165, 1),('s-m-ten-02-2', 'm-ten-02', 'Winner', 'Gauff', 225, 1),
('s-m-cric-01-1', 'm-cric-01', 'Winner', 'Mumbai', 175, 0),('s-m-cric-01-2', 'm-cric-01', 'Winner', 'Chennai', 205, 0),
('s-m-rug-01-1', 'm-rug-01', '1X2', '1', 190, 0),('s-m-rug-01-x', 'm-rug-01', '1X2', 'X', 2100, 0),('s-m-rug-01-2', 'm-rug-01', '1X2', '2', 185, 0),
('s-m-hock-01-1', 'm-hock-01', 'Moneyline', '1', 220, 0),('s-m-hock-01-2', 'm-hock-01', 'Moneyline', '2', 168, 0),
('s-m-voll-01-1', 'm-voll-01', 'Winner', 'Brazil', 190, 0),('s-m-voll-01-2', 'm-voll-01', 'Winner', 'Poland', 190, 0),
('s-m-tt-01-1', 'm-tt-01', 'Winner', 'Fan Z.', 140, 1),('s-m-tt-01-2', 'm-tt-01', 'Winner', 'Moregardh', 290, 1),
('s-m-mma-01-1', 'm-mma-01', 'Winner', 'Du Plessis', 160, 0),('s-m-mma-01-2', 'm-mma-01', 'Winner', 'Strickland', 235, 0),
('s-m-box-01-1', 'm-box-01', 'Winner', 'Usyk', 175, 0),('s-m-box-01-2', 'm-box-01', 'Winner', 'Fury', 205, 0),
('s-m-base-01-1', 'm-base-01', 'Moneyline', '1', 200, 0),('s-m-base-01-2', 'm-base-01', 'Moneyline', '2', 180, 0),
('s-m-amfb-01-1', 'm-amfb-01', 'Spread', 'Chiefs -3.5', 190, 0),('s-m-amfb-01-2', 'm-amfb-01', 'Spread', 'Bills +3.5', 190, 0),
('s-m-dart-01-1', 'm-dart-01', 'Winner', 'Littler', 175, 0),('s-m-dart-01-2', 'm-dart-01', 'Winner', 'Humphries', 205, 0),
('s-m-espo-01-1', 'm-espo-01', 'Winner', 'FaZe', 200, 1),('s-m-espo-01-2', 'm-espo-01', 'Winner', 'NAVI', 178, 1),
('s-m-foot-08-1', 'm-foot-08', '1X2', '1', 310, 0),('s-m-foot-08-x', 'm-foot-08', '1X2', 'X', 340, 0),('s-m-foot-08-2', 'm-foot-08', '1X2', '2', 230, 0),
('s-m-foot-09-1', 'm-foot-09', '1X2', '1', 210, 0),('s-m-foot-09-x', 'm-foot-09', '1X2', 'X', 320, 0),('s-m-foot-09-2', 'm-foot-09', '1X2', '2', 350, 0);
INSERT OR IGNORE INTO game_rounds (id, game, round_no, status, multiplier100, result_text, created_at) VALUES
('gr-av-101', 'aviator', 101, 'settled', 234, 'Flew @ 2.34x', '2026-11-01T10:00:00Z'),
('gr-av-102', 'aviator', 102, 'settled', 112, 'Crashed @ 1.12x', '2026-11-01T10:05:00Z'),
('gr-av-103', 'aviator', 103, 'settled', 587, 'Flew @ 5.87x', '2026-11-01T10:10:00Z'),
('gr-vt-201', 'virtual', 201, 'settled', 0, 'Virtual Lions 2-1 Virtual Eagles', '2026-11-01T11:00:00Z');

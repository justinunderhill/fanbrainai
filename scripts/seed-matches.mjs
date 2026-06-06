// One-off: upsert the expanded teams + matches into Supabase using the
// service-role key. Mirrors supabase/seed.sql. Run with:
//   node --env-file=.env scripts/seed-matches.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

const id = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;
const mid = (n) => `10000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;

const teams = [
  [1, 'Mexico', 'MEX', 'A', '🇲🇽'],
  [2, 'South Africa', 'RSA', 'A', '🇿🇦'],
  [3, 'United States', 'USA', 'D', '🇺🇸'],
  [4, 'Paraguay', 'PAR', 'D', '🇵🇾'],
  [5, 'Canada', 'CAN', 'B', '🇨🇦'],
  [6, 'TBC Opponent', 'TBC', 'B', '🏳️'],
  [7, 'Brazil', 'BRA', 'F', '🇧🇷'],
  [8, 'Japan', 'JPN', 'F', '🇯🇵'],
  [9, 'Argentina', 'ARG', 'C', '🇦🇷'],
  [10, 'Nigeria', 'NGA', 'C', '🇳🇬'],
  [11, 'France', 'FRA', 'E', '🇫🇷'],
  [12, 'Croatia', 'CRO', 'E', '🇭🇷'],
  [13, 'England', 'ENG', 'G', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  [14, 'Australia', 'AUS', 'G', '🇦🇺'],
  [15, 'Spain', 'ESP', 'H', '🇪🇸'],
  [16, 'Morocco', 'MAR', 'H', '🇲🇦'],
].map(([n, name, country_code, group_name, emoji_flag]) => ({
  id: id(n), name, country_code, group_name, emoji_flag,
}));

const matches = [
  [1, 1, 2, '2026-06-11T19:00:00Z', 'Estadio Banorte, Mexico City'],
  [2, 3, 4, '2026-06-12T19:00:00Z', 'SoFi Stadium, Los Angeles'],
  [3, 5, 6, '2026-06-12T22:00:00Z', 'BMO Field, Toronto'],
  [4, 7, 8, '2026-06-14T19:00:00Z', 'Venue TBC'],
  [5, 9, 10, '2026-06-15T19:00:00Z', 'MetLife Stadium, New Jersey'],
  [6, 11, 12, '2026-06-16T19:00:00Z', 'Mercedes-Benz Stadium, Atlanta'],
  [7, 13, 14, '2026-06-17T16:00:00Z', 'Lumen Field, Seattle'],
  [8, 15, 16, '2026-06-18T19:00:00Z', 'Hard Rock Stadium, Miami'],
  [9, 1, 4, '2026-06-19T22:00:00Z', 'Estadio Akron, Guadalajara'],
  [10, 7, 11, '2026-06-20T19:00:00Z', 'AT&T Stadium, Dallas'],
].map(([n, home, away, kickoff_time, venue]) => ({
  id: mid(n),
  external_match_id: `seed-${String(n).padStart(3, '0')}`,
  home_team_id: id(home),
  away_team_id: id(away),
  kickoff_time,
  venue,
  stage: 'Group stage',
  status: 'scheduled',
}));

const { error: teamErr } = await supabase.from('teams').upsert(teams, { onConflict: 'id' });
if (teamErr) { console.error('teams upsert failed:', teamErr.message); process.exit(1); }
console.log(`Upserted ${teams.length} teams.`);

const { error: matchErr } = await supabase.from('matches').upsert(matches, { onConflict: 'id' });
if (matchErr) { console.error('matches upsert failed:', matchErr.message); process.exit(1); }
console.log(`Upserted ${matches.length} matches.`);

const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });
console.log(`Total matches now in DB: ${count}`);

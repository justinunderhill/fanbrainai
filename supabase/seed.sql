-- Small starter seed. Replace or extend this with a provider-driven fixture import.
-- Times are UTC.

insert into public.teams (id, name, country_code, group_name, emoji_flag) values
('00000000-0000-0000-0000-000000000001', 'Mexico', 'MEX', 'A', '🇲🇽'),
('00000000-0000-0000-0000-000000000002', 'South Africa', 'RSA', 'A', '🇿🇦'),
('00000000-0000-0000-0000-000000000003', 'United States', 'USA', 'D', '🇺🇸'),
('00000000-0000-0000-0000-000000000004', 'Paraguay', 'PAR', 'D', '🇵🇾'),
('00000000-0000-0000-0000-000000000005', 'Canada', 'CAN', 'B', '🇨🇦'),
('00000000-0000-0000-0000-000000000006', 'TBC Opponent', 'TBC', 'B', '🏳️'),
('00000000-0000-0000-0000-000000000007', 'Brazil', 'BRA', 'F', '🇧🇷'),
('00000000-0000-0000-0000-000000000008', 'Japan', 'JPN', 'F', '🇯🇵'),
('00000000-0000-0000-0000-000000000009', 'Argentina', 'ARG', 'C', '🇦🇷'),
('00000000-0000-0000-0000-000000000010', 'Nigeria', 'NGA', 'C', '🇳🇬'),
('00000000-0000-0000-0000-000000000011', 'France', 'FRA', 'E', '🇫🇷'),
('00000000-0000-0000-0000-000000000012', 'Croatia', 'CRO', 'E', '🇭🇷'),
('00000000-0000-0000-0000-000000000013', 'England', 'ENG', 'G', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
('00000000-0000-0000-0000-000000000014', 'Australia', 'AUS', 'G', '🇦🇺'),
('00000000-0000-0000-0000-000000000015', 'Spain', 'ESP', 'H', '🇪🇸'),
('00000000-0000-0000-0000-000000000016', 'Morocco', 'MAR', 'H', '🇲🇦')
on conflict (id) do update set
name = excluded.name,
country_code = excluded.country_code,
group_name = excluded.group_name,
emoji_flag = excluded.emoji_flag;

insert into public.matches (id, external_match_id, home_team_id, away_team_id, kickoff_time, venue, stage, status) values
('10000000-0000-0000-0000-000000000001', 'seed-001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-06-11T19:00:00Z', 'Estadio Banorte, Mexico City', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000002', 'seed-002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', '2026-06-12T19:00:00Z', 'SoFi Stadium, Los Angeles', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000003', 'seed-003', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', '2026-06-12T22:00:00Z', 'BMO Field, Toronto', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000004', 'seed-004', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', '2026-06-14T19:00:00Z', 'Venue TBC', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000005', 'seed-005', '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', '2026-06-15T19:00:00Z', 'MetLife Stadium, New Jersey', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000006', 'seed-006', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', '2026-06-16T19:00:00Z', 'Mercedes-Benz Stadium, Atlanta', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000007', 'seed-007', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000014', '2026-06-17T16:00:00Z', 'Lumen Field, Seattle', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000008', 'seed-008', '00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000016', '2026-06-18T19:00:00Z', 'Hard Rock Stadium, Miami', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000009', 'seed-009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '2026-06-19T22:00:00Z', 'Estadio Akron, Guadalajara', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000010', 'seed-010', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000011', '2026-06-20T19:00:00Z', 'AT&T Stadium, Dallas', 'Group stage', 'scheduled')
on conflict (id) do update set
external_match_id = excluded.external_match_id,
home_team_id = excluded.home_team_id,
away_team_id = excluded.away_team_id,
kickoff_time = excluded.kickoff_time,
venue = excluded.venue,
stage = excluded.stage,
status = excluded.status;

-- Small starter seed. Replace or extend this with a provider-driven fixture import.
-- Times are UTC.

insert into public.teams (id, name, country_code, group_name, emoji_flag) values
('00000000-0000-0000-0000-000000000001', 'Mexico', 'MEX', 'A', '🇲🇽'),
('00000000-0000-0000-0000-000000000002', 'South Africa', 'RSA', 'A', '🇿🇦'),
('00000000-0000-0000-0000-000000000003', 'United States', 'USA', 'D', '🇺🇸'),
('00000000-0000-0000-0000-000000000004', 'Paraguay', 'PAR', 'D', '🇵🇾'),
('00000000-0000-0000-0000-000000000005', 'Canada', 'CAN', 'B', '🇨🇦'),
('00000000-0000-0000-0000-000000000006', 'TBC Opponent', 'TBC', 'B', '🏳️'),
('00000000-0000-0000-0000-000000000007', 'Brazil', 'BRA', 'TBC', '🇧🇷'),
('00000000-0000-0000-0000-000000000008', 'Japan', 'JPN', 'TBC', '🇯🇵')
on conflict (id) do update set
name = excluded.name,
country_code = excluded.country_code,
group_name = excluded.group_name,
emoji_flag = excluded.emoji_flag;

insert into public.matches (id, external_match_id, home_team_id, away_team_id, kickoff_time, venue, stage, status) values
('10000000-0000-0000-0000-000000000001', 'seed-001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '2026-06-11T19:00:00Z', 'Estadio Banorte, Mexico City', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000002', 'seed-002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', '2026-06-12T19:00:00Z', 'SoFi Stadium, Los Angeles', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000003', 'seed-003', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', '2026-06-12T22:00:00Z', 'BMO Field, Toronto', 'Group stage', 'scheduled'),
('10000000-0000-0000-0000-000000000004', 'seed-004', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', '2026-06-14T19:00:00Z', 'Venue TBC', 'Group stage', 'scheduled')
on conflict (id) do update set
external_match_id = excluded.external_match_id,
home_team_id = excluded.home_team_id,
away_team_id = excluded.away_team_id,
kickoff_time = excluded.kickoff_time,
venue = excluded.venue,
stage = excluded.stage,
status = excluded.status;

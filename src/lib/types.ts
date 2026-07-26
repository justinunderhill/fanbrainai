export type MatchStatus = 'scheduled' | 'live' | 'final' | 'postponed';
export type Outcome = 'HOME' | 'DRAW' | 'AWAY';
export type PredictionStyle = 'head' | 'heart' | 'chaos' | 'underdog' | 'tactical' | 'vibes';

export type Team = {
  id: string;
  name: string;
  country_code: string;
  group_name: string | null;
  emoji_flag: string | null;
  // Club crest image URL (football-data.org `crest` field). Populated for
  // both clubs and national federations, so `is_national_team` (not the
  // presence of this field) decides whether TeamBadge shows it or a flag.
  crest_url: string | null;
  is_national_team: boolean;
};

export type Competition = {
  id: string;
  code: string;
  name: string;
  season: string;
  is_active: boolean;
};

export type MatchWithTeams = {
  id: string;
  competition_id: string;
  stage: string;
  venue: string | null;
  kickoff_time: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  is_knockout: boolean;
  home_team: Team;
  away_team: Team;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_outcome: Outcome;
  // Team the fan called to advance on penalties for a level knockout pick; null otherwise.
  predicted_winner_team_id: string | null;
  prediction_style: PredictionStyle;
  user_reason: string | null;
  points_awarded: number;
  ai_verdict: string | null;
  ai_roast: string | null;
  ai_debrief: string | null;
  share_token: string;
};

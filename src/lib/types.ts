export type MatchStatus = 'scheduled' | 'live' | 'final' | 'postponed';
export type Outcome = 'HOME' | 'DRAW' | 'AWAY';
export type PredictionStyle = 'head' | 'heart' | 'chaos' | 'underdog' | 'tactical' | 'vibes';

export type Team = {
  id: string;
  name: string;
  country_code: string;
  group_name: string | null;
  emoji_flag: string | null;
};

export type MatchWithTeams = {
  id: string;
  stage: string;
  venue: string | null;
  kickoff_time: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
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

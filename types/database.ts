export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type TournamentStatus = 'upcoming' | 'active' | 'completed'

export interface Team {
  id: string
  name: string
  short_name: string
  country_code: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  name: string
  sport: string
  start_date: string
  end_date: string
  status: TournamentStatus
  scoring_rules: Json | null
  created_at: string
  updated_at: string
}

export interface TournamentTeam {
  tournament_id: string
  team_id: string
  created_at: string
}

export interface Match {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  round: string | null
  multiplier: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  screen_name: string | null
  avatar_url: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  points_earned: number
  created_at: string
  updated_at: string
}

export interface TournamentRanking {
  user_id: string
  tournament_id: string
  total_points: number
  rank: number
  // Note: This is now a computed view, not a table
  // created_at and updated_at are not available
}

// Extended types with relations
export interface MatchWithTeams extends Match {
  home_team: Team
  away_team: Team
}

export interface PredictionWithMatch extends Prediction {
  match: MatchWithTeams
}

export interface RankingWithUser extends TournamentRanking {
  user: User
}

export interface TournamentWithTeams extends Tournament {
  teams: Team[]
}

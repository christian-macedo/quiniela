export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TournamentStatus = "upcoming" | "active" | "completed";
export type UserStatus = "active" | "deactivated";

export interface Team {
  id: string;
  name: string;
  short_name: string;
  country_code: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  scoring_rules: Json | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentTeam {
  tournament_id: string;
  team_id: string;
  created_at: string;
}

export interface TournamentParticipant {
  tournament_id: string;
  user_id: string;
  joined_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  round: string | null;
  multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  screen_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  status: UserStatus;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentRanking {
  user_id: string;
  tournament_id: string;
  total_points: number;
  rank: number;
  // Note: This is now a computed view, not a table
  // created_at and updated_at are not available
}

// Extended types with relations
export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

export interface PredictionWithMatch extends Prediction {
  match: MatchWithTeams;
}

export interface RankingWithUser extends TournamentRanking {
  user: User;
}

export interface TournamentWithTeams extends Tournament {
  teams: Team[];
}

// Partial User Types for Privacy Protection

/**
 * Public user profile - safe for public display in leaderboards, rankings, profiles
 * Excludes all sensitive fields (email, is_admin, last_login, status)
 */
export type PublicUserProfile = Pick<
  User,
  "id" | "screen_name" | "avatar_url" | "created_at" | "updated_at"
>;

/**
 * Privacy-protected user - includes status for internal checks but no other sensitive data
 * Used in contexts where we need to check user status but still protect PII
 */
export type PrivacyProtectedUser = Pick<
  User,
  "id" | "screen_name" | "avatar_url" | "status" | "created_at" | "updated_at"
>;

/**
 * Admin view user - extends PublicUserProfile with masked email for admin displays
 * Email is masked (e.g., "j***@example.com") for enhanced privacy
 */
export type AdminUserView = PublicUserProfile & {
  email: string; // Masked email string
};

/**
 * Ranking with public user data - used in tournament leaderboards
 */
export type RankingWithPublicUser = TournamentRanking & {
  user: PublicUserProfile;
};

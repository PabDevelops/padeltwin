export type PlayerLevel = "iniciacion" | "intermedio" | "avanzado";
export type MatchStatus = "open" | "full" | "cancelled";
export type Sex = "male" | "female" | "other";
export type DominantHand = "left" | "right";
export type MatchMode = "pair" | "individual";
export type MatchVisibility = "open" | "closed";

export interface Profile {
  id: string;
  full_name: string | null;
  level: PlayerLevel | null;
  zone: string | null;
  avatar_url: string | null;
  elo: number;
  height_cm: number | null;
  sex: Sex | null;
  dominant_hand: DominantHand | null;
  club: string | null;
  racket: string | null;
  apparel_brand: string | null;
  looking_for_partner: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  created_by: string;
  date_time: string;
  location: string;
  level: PlayerLevel;
  max_players: number;
  status: MatchStatus;
  mode: MatchMode;
  visibility: MatchVisibility;
  created_at: string;
}

export interface MatchPlayer {
  match_id: string;
  player_id: string;
  joined_at: string;
}

export interface MatchWithPlayers extends Match {
  match_players: (MatchPlayer & { profiles: Profile | null })[];
}

export type RequestStatus = "pending" | "accepted" | "rejected";

export interface PartnerRequest {
  id: string;
  from_id: string;
  to_id: string;
  status: RequestStatus;
  created_at: string;
}

export interface PartnerRequestWithProfiles extends PartnerRequest {
  from_profile: Profile | null;
  to_profile: Profile | null;
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export type Team = "a" | "b";

export interface SetScore {
  a: number;
  b: number;
}

export interface MatchResult {
  id: string;
  match_id: string;
  team_a_player1: string;
  team_a_player2: string;
  team_b_player1: string;
  team_b_player2: string;
  sets: SetScore[];
  winner: Team;
  recorded_by: string;
  created_at: string;
}

export interface MatchResultWithProfiles extends MatchResult {
  team_a_player1_profile: Profile | null;
  team_a_player2_profile: Profile | null;
  team_b_player1_profile: Profile | null;
  team_b_player2_profile: Profile | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & {
          created_by: string;
          date_time: string;
          location: string;
          level: PlayerLevel;
        };
        Update: Partial<Match>;
      };
      match_players: {
        Row: MatchPlayer;
        Insert: Pick<MatchPlayer, "match_id" | "player_id">;
        Update: Partial<MatchPlayer>;
      };
    };
  };
}

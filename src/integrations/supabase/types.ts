
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: string
        }
        Insert: {
          id?: string
          email: string
          role: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          image_url: string | null
          bio: string | null
          skill_rating: number
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          image_url?: string | null
          bio?: string | null
          skill_rating: number
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          image_url?: string | null
          bio?: string | null
          skill_rating?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      positions: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      player_positions: {
        Row: {
          id: string
          player_id: string
          position_id: string
        }
        Insert: {
          id?: string
          player_id: string
          position_id: string
        }
        Update: {
          id?: string
          player_id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_positions_player_id_fkey"
            columns: ["player_id"]
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_positions_position_id_fkey"
            columns: ["position_id"]
            referencedRelation: "positions"
            referencedColumns: ["id"]
          }
        ]
      }
      match_days: {
        Row: {
          id: string
          date: string
          created_by: string | null
          created_at: string
          team_generated: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          date: string
          created_by?: string | null
          created_at?: string
          team_generated?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          date?: string
          created_by?: string | null
          created_at?: string
          team_generated?: boolean
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_days_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      match_teams: {
        Row: {
          id: string
          match_day_id: string
          team_name: string
        }
        Insert: {
          id?: string
          match_day_id: string
          team_name: string
        }
        Update: {
          id?: string
          match_day_id?: string
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_teams_match_day_id_fkey"
            columns: ["match_day_id"]
            referencedRelation: "match_days"
            referencedColumns: ["id"]
          }
        ]
      }
      team_players: {
        Row: {
          id: string
          match_team_id: string
          player_id: string
          position_id: string
        }
        Insert: {
          id?: string
          match_team_id: string
          player_id: string
          position_id: string
        }
        Update: {
          id?: string
          match_team_id?: string
          player_id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_match_team_id_fkey"
            columns: ["match_team_id"]
            referencedRelation: "match_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_position_id_fkey"
            columns: ["position_id"]
            referencedRelation: "positions"
            referencedColumns: ["id"]
          }
        ]
      }
      matches: {
        Row: {
          id: string
          match_day_id: string
          game_number: number
          team_a_score: number
          team_b_score: number
          added_by: string | null
        }
        Insert: {
          id?: string
          match_day_id: string
          game_number: number
          team_a_score: number
          team_b_score: number
          added_by?: string | null
        }
        Update: {
          id?: string
          match_day_id?: string
          game_number?: number
          team_a_score?: number
          team_b_score?: number
          added_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_match_day_id_fkey"
            columns: ["match_day_id"]
            referencedRelation: "match_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_added_by_fkey"
            columns: ["added_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updateables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

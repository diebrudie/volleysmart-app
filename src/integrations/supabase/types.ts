export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      club_members: {
        Row: {
          club_id: string | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          role: string;
          user_id: string | null;
        };
        Insert: {
          club_id?: string | null;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          role?: string;
          user_id?: string | null;
        };
        Update: {
          club_id?: string | null;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          role?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          }
        ];
      };
      clubs: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          slug: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          slug?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          slug?: string | null;
        };
        Relationships: [];
      };
      match_days: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          created_by: string | null;
          date: string;
          id: string;
          notes: string | null;
          team_generated: boolean | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date: string;
          id?: string;
          notes?: string | null;
          team_generated?: boolean | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string;
          id?: string;
          notes?: string | null;
          team_generated?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_days_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          }
        ];
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          team_name: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          team_name: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          team_name?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      match_teams: {
        Row: {
          created_at: string | null;
          id: string;
          match_day_id: string;
          team_name: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          match_day_id: string;
          team_name: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          match_day_id?: string;
          team_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_teams_match_day_id_fkey";
            columns: ["match_day_id"];
            isOneToOne: false;
            referencedRelation: "match_days";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          added_by_user_id: string;
          game_number: number;
          id: string;
          match_day_id: string;
          team_a_score: number;
          team_b_score: number;
        };
        Insert: {
          added_by_user_id: string;
          game_number: number;
          id?: string;
          match_day_id: string;
          team_a_score: number;
          team_b_score: number;
        };
        Update: {
          added_by_user_id?: string;
          game_number?: number;
          id?: string;
          match_day_id?: string;
          team_a_score?: number;
          team_b_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "matches_match_day_id_fkey";
            columns: ["match_day_id"];
            isOneToOne: false;
            referencedRelation: "match_days";
            referencedColumns: ["id"];
          }
        ];
      };
      player_positions: {
        Row: {
          id: string;
          is_primary: boolean;
          player_id: string;
          position_id: string;
        };
        Insert: {
          id?: string;
          is_primary?: boolean;
          player_id: string;
          position_id: string;
        };
        Update: {
          id?: string;
          is_primary?: boolean;
          player_id?: string;
          position_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_positions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_positions_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["id"];
          }
        ];
      };
      players: {
        Row: {
          bio: string | null;
          birthday: string | null;
          club_id: string | null;
          first_name: string;
          gender: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          last_name: string;
          member_association: boolean;
          skill_rating: number | null;
          user_id: string;
        };
        Insert: {
          bio?: string | null;
          birthday?: string | null;
          club_id?: string | null;
          first_name: string;
          gender?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          last_name: string;
          member_association: boolean;
          skill_rating?: number | null;
          user_id: string;
        };
        Update: {
          bio?: string | null;
          birthday?: string | null;
          club_id?: string | null;
          first_name?: string;
          gender?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          last_name?: string;
          member_association?: boolean;
          skill_rating?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          }
        ];
      };
      positions: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      team_players: {
        Row: {
          id: string;
          match_team_id: string;
          player_id: string;
          position_id: string;
        };
        Insert: {
          id?: string;
          match_team_id: string;
          player_id: string;
          position_id: string;
        };
        Update: {
          id?: string;
          match_team_id?: string;
          player_id?: string;
          position_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_players_match_team_id_fkey";
            columns: ["match_team_id"];
            isOneToOne: false;
            referencedRelation: "match_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_players_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["id"];
          }
        ];
      };
      user_profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_profile: {
        Args: { viewed_user_id: string };
        Returns: boolean;
      };
      check_is_club_member: {
        Args: { club_uuid: string; user_uuid: string };
        Returns: boolean;
      };
      club_has_members: {
        Args: { club_uuid: string };
        Returns: boolean;
      };
      is_club_admin: {
        Args: { _club_id: string } | { club_uuid: string; user_uuid: string };
        Returns: boolean;
      };
      is_club_admin_or_editor: {
        Args: { club_uuid: string; user_uuid: string };
        Returns: boolean;
      };
      is_club_admin_safe: {
        Args: { club_uuid: string; user_uuid: string };
        Returns: boolean;
      };
      is_club_admin_secure: {
        Args: { club_uuid: string; user_uuid: string };
        Returns: boolean;
      };
      is_club_creator: {
        Args: { input_club_id: string; input_user_id: string };
        Returns: boolean;
      };
      is_club_member: {
        Args: { club_uuid: string; user_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

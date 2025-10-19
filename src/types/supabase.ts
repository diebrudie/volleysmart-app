export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
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
      game_players: {
        Row: {
          adjusted_at: string | null;
          adjusted_by: string | null;
          adjustment_reason: string | null;
          created_at: string | null;
          id: string;
          manually_adjusted: boolean | null;
          match_day_id: string;
          original_team_name: string | null;
          player_id: string;
          position_played: string | null;
          team_name: string;
          updated_at: string | null;
        };
        Insert: {
          adjusted_at?: string | null;
          adjusted_by?: string | null;
          adjustment_reason?: string | null;
          created_at?: string | null;
          id?: string;
          manually_adjusted?: boolean | null;
          match_day_id: string;
          original_team_name?: string | null;
          player_id: string;
          position_played?: string | null;
          team_name: string;
          updated_at?: string | null;
        };
        Update: {
          adjusted_at?: string | null;
          adjusted_by?: string | null;
          adjustment_reason?: string | null;
          created_at?: string | null;
          id?: string;
          manually_adjusted?: boolean | null;
          match_day_id?: string;
          original_team_name?: string | null;
          player_id?: string;
          position_played?: string | null;
          team_name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_game_players_match_day";
            columns: ["match_day_id"];
            isOneToOne: false;
            referencedRelation: "match_days";
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
      locations: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          }
        ];
      };
      match_days: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          created_by: string | null;
          date: string;
          id: string;
          location_id: string | null;
          notes: string | null;
          team_generated: boolean | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date: string;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          team_generated?: boolean | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string;
          id?: string;
          location_id?: string | null;
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
          },
          {
            foreignKeyName: "match_days_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
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
          competition_level: string | null;
          first_name: string;
          game_performance: string | null;
          gender: string;
          general_skill_level: string | null;
          height_cm: number | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_temporary: boolean | null;
          last_name: string;
          last_rating_update: string | null;
          match_experience: string | null;
          member_association: boolean;
          profile_completed: boolean | null;
          rating_history: Json | null;
          skill_rating: number | null;
          total_matches_played: number | null;
          training_status: string | null;
          user_id: string | null;
        };
        Insert: {
          bio?: string | null;
          birthday?: string | null;
          club_id?: string | null;
          competition_level?: string | null;
          first_name: string;
          game_performance?: string | null;
          gender?: string;
          general_skill_level?: string | null;
          height_cm?: number | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_temporary?: boolean | null;
          last_name: string;
          last_rating_update?: string | null;
          match_experience?: string | null;
          member_association: boolean;
          profile_completed?: boolean | null;
          rating_history?: Json | null;
          skill_rating?: number | null;
          total_matches_played?: number | null;
          training_status?: string | null;
          user_id?: string | null;
        };
        Update: {
          bio?: string | null;
          birthday?: string | null;
          club_id?: string | null;
          competition_level?: string | null;
          first_name?: string;
          game_performance?: string | null;
          gender?: string;
          general_skill_level?: string | null;
          height_cm?: number | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_temporary?: boolean | null;
          last_name?: string;
          last_rating_update?: string | null;
          match_experience?: string | null;
          member_association?: boolean;
          profile_completed?: boolean | null;
          rating_history?: Json | null;
          skill_rating?: number | null;
          total_matches_played?: number | null;
          training_status?: string | null;
          user_id?: string | null;
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
      delete_match_day_with_matches: {
        Args: { match_day_id: string };
        Returns: undefined;
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
      user_can_view_club_members: {
        Args: { target_club_id: string };
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

export type UserRole = "admin" | "editor" | "member" | "user";

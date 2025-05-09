
import { Database } from "@/integrations/supabase/types";

// Define types based on the generated Database type
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// Add any additional custom types here
export type UserRole = 'admin' | 'editor' | 'user';

export interface Player {
  id: number;
  name: string;
  email: string;
  positions: string[];
  preferredPosition: string;
  availability: boolean;
  matchesPlayed: number;
  skillRating: number;
  isPublic: boolean;
  gender: 'male' | 'female' | 'other' | 'diverse';
  birthday?: Date;
}

export interface Match {
  id: number;
  date: string;
  location: string;
  teams: {
    teamA: Player[];
    teamB: Player[];
  };
  score?: {
    teamA: number;
    teamB: number;
  };
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

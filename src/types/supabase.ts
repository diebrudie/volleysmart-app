
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
  birthday?: string | Date; // Updated to allow both string and Date
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

// New club-related types
export interface Club {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  createdBy: string;
  createdAt: string;
}

export type ClubMemberRole = 'admin' | 'editor' | 'member';

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  joinedAt: string;
}

// Add the MatchScore type for consistency
export interface MatchScore {
  gameNumber: number;
  teamA: number | null;
  teamB: number | null;
  setNumber: number;
  teamAScore: number | null;
  teamBScore: number | null;
}

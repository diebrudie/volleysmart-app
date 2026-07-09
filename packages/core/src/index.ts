// Supabase client management
export { setSupabaseClient, getSupabaseClient } from './supabase/clientHolder';

// Database types
export * from './supabase/types';

// Data layer
export * from './supabase/profiles';
export * from './supabase/players';
export * from './supabase/club';
export * from './supabase/clubMembers';
export * from './supabase/plannedEvents';
export * from './supabase/matchDays';
export * from './supabase/notifications';
export * from './supabase/notificationPreferences';
export * from './supabase/positions';
export * from './supabase/storage';
export * from './supabase/eventTemplates';
export * from './supabase/playerStats';
export * from './supabase/clubStats';
export * from './supabase/skillProgression';
export * from './supabase/members';
export * from './supabase/faqs';
export * from './supabase/rpc';

// Team assignment algorithm (pure TS)
export * from './teams/positions';
export * from './teams/assignLineup';

// Utilities
export * from './utils/formatName';
export * from './utils/dateLocale';

// i18n translations
export { translations } from './i18n';

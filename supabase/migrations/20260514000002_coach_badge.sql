-- Add is_coach column to club_members
ALTER TABLE club_members
  ADD COLUMN IF NOT EXISTS is_coach boolean NOT NULL DEFAULT false;

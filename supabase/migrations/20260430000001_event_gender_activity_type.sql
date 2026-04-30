-- Add event gender and activity type to planned_events

CREATE TYPE public.event_gender AS ENUM ('mixed', 'women_only', 'men_only');
CREATE TYPE public.activity_type AS ENUM ('indoor', 'beach');

ALTER TABLE public.planned_events
  ADD COLUMN event_gender public.event_gender NOT NULL DEFAULT 'mixed',
  ADD COLUMN activity_type public.activity_type NOT NULL DEFAULT 'indoor';

-- Add queer and flinta options to event_gender enum
ALTER TYPE public.event_gender ADD VALUE IF NOT EXISTS 'queer';
ALTER TYPE public.event_gender ADD VALUE IF NOT EXISTS 'flinta';

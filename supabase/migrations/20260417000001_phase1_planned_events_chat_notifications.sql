-- Phase 1: Planned Events, RSVP, Chat, Notifications
-- =====================================================

-- ENUMS
CREATE TYPE public.event_type AS ENUM (
  'friendly_game',
  'social_game',
  'training',
  'tournament'
);

CREATE TYPE public.event_status AS ENUM (
  'open',
  'confirmed',
  'cancelled',
  'completed'
);

CREATE TYPE public.rsvp_status AS ENUM (
  'attending',
  'declined',
  'maybe'
);


-- PLANNED EVENTS
-- Stores future scheduled events. club_id is nullable for multi-club tournaments
-- (those use event_clubs junction table instead).
CREATE TABLE public.planned_events (
  id             uuid        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  club_id        uuid        REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by     uuid        NOT NULL REFERENCES auth.users(id),
  title          text        NOT NULL,
  event_type     public.event_type NOT NULL,
  date           date        NOT NULL,
  start_time     time        NOT NULL,
  location_id    uuid        REFERENCES public.locations(id),
  is_public      boolean     NOT NULL DEFAULT true,
  max_players    integer,
  min_players    integer     NOT NULL DEFAULT 4,
  notes          text,
  rsvp_deadline  timestamptz,
  status         public.event_status NOT NULL DEFAULT 'open',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER planned_events_updated_at
  BEFORE UPDATE ON public.planned_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- EVENT CLUBS (multi-club junction, e.g. for tournaments)
CREATE TABLE public.event_clubs (
  event_id uuid NOT NULL REFERENCES public.planned_events(id) ON DELETE CASCADE,
  club_id  uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, club_id)
);


-- EVENT RSVP
CREATE TABLE public.event_rsvp (
  id           uuid        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  event_id     uuid        NOT NULL REFERENCES public.planned_events(id) ON DELETE CASCADE,
  player_id    uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status       public.rsvp_status NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);


-- MESSAGES (per-club chat; event_id reserved for future per-event threads)
CREATE TABLE public.messages (
  id         uuid        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  club_id    uuid        REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id   uuid        REFERENCES public.planned_events(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES auth.users(id),
  content    text        NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast club chat queries
CREATE INDEX messages_club_id_created_at_idx ON public.messages (club_id, created_at DESC);


-- NOTIFICATIONS (in-app activity log per user)
CREATE TABLE public.notifications (
  id         uuid        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  payload    jsonb       NOT NULL DEFAULT '{}',
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_read_idx ON public.notifications (user_id, read, created_at DESC);


-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.planned_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_clubs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvp     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- PLANNED EVENTS POLICIES
-- Members of the event's club can read it (public events also visible to non-members)
CREATE POLICY "Club members can view their club's events"
  ON public.planned_events FOR SELECT
  USING (
    is_public = true
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Club admins and editors can create events"
  ON public.planned_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      club_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_id = planned_events.club_id
          AND user_id = auth.uid()
          AND role IN ('admin', 'editor')
          AND status = 'active'
      )
    )
  );

CREATE POLICY "Event creator or club admin can update events"
  ON public.planned_events FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = planned_events.club_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );

CREATE POLICY "Event creator or club admin can delete events"
  ON public.planned_events FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = planned_events.club_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );

-- EVENT CLUBS POLICIES
CREATE POLICY "Club members can view event_clubs"
  ON public.event_clubs FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Event creator can manage event_clubs"
  ON public.event_clubs FOR ALL
  USING (
    event_id IN (
      SELECT id FROM public.planned_events WHERE created_by = auth.uid()
    )
  );

-- EVENT RSVP POLICIES
CREATE POLICY "Club members can view RSVPs for their events"
  ON public.event_rsvp FOR SELECT
  USING (
    event_id IN (
      SELECT pe.id FROM public.planned_events pe
      JOIN public.club_members cm ON cm.club_id = pe.club_id
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own RSVP"
  ON public.event_rsvp FOR ALL
  USING (
    player_id IN (
      SELECT id FROM public.players WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    player_id IN (
      SELECT id FROM public.players WHERE user_id = auth.uid()
    )
  );

-- MESSAGES POLICIES
CREATE POLICY "Club members can read their club's messages"
  ON public.messages FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Club members can send messages to their clubs"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their notifications as read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

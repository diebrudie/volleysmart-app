-- Add is_early_adopter boolean to players, permanently marking the first 100 users
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS is_early_adopter boolean NOT NULL DEFAULT false;

-- Mark the first 100 players by created_at as early adopters
WITH first_100 AS (
  SELECT id
  FROM public.players
  ORDER BY created_at ASC
  LIMIT 100
)
UPDATE public.players
SET is_early_adopter = true
WHERE id IN (SELECT id FROM first_100);

-- Auto-flag new early adopters until we reach 100
-- Uses a trigger that checks current count before setting the flag
CREATE OR REPLACE FUNCTION public.set_early_adopter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT count(*) FROM public.players WHERE is_early_adopter = true) < 100 THEN
    NEW.is_early_adopter := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_early_adopter ON public.players;
CREATE TRIGGER trg_set_early_adopter
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.set_early_adopter();

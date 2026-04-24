-- Cleanup: drop old slug-based join RPCs replaced by token-based invite system
DROP FUNCTION IF EXISTS public.request_join_by_slug(text, boolean);
DROP FUNCTION IF EXISTS public.request_club_membership(text);
DROP FUNCTION IF EXISTS public.request_membership(uuid);
DROP FUNCTION IF EXISTS public.get_club_preview_by_slug(text);

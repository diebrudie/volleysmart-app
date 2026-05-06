-- Migration: Update notification helpers to respect user preferences
-- LEFT JOIN notification_preferences; COALESCE(in_app, true) = no row means enabled

CREATE OR REPLACE FUNCTION public.notify_club_members(
  p_club_id uuid,
  p_type text,
  p_payload jsonb,
  p_exclude_user_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, payload)
  SELECT cm.user_id, p_type, p_payload
  FROM public.club_members cm
  LEFT JOIN public.notification_preferences np
    ON np.user_id = cm.user_id AND np.notification_type = p_type
  WHERE cm.club_id = p_club_id
    AND cm.status = 'active'
    AND cm.is_active = true
    AND (p_exclude_user_id IS NULL OR cm.user_id != p_exclude_user_id)
    AND COALESCE(np.in_app, true) = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_club_admins(
  p_club_id uuid,
  p_type text,
  p_payload jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, payload)
  SELECT cm.user_id, p_type, p_payload
  FROM public.club_members cm
  LEFT JOIN public.notification_preferences np
    ON np.user_id = cm.user_id AND np.notification_type = p_type
  WHERE cm.club_id = p_club_id
    AND cm.status = 'active'
    AND cm.is_active = true
    AND cm.role = 'admin'
    AND COALESCE(np.in_app, true) = true;
END;
$$;

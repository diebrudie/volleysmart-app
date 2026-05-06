import { supabase } from "./client";
import type { NotificationType } from "./notifications";

export interface NotificationPref {
  in_app: boolean;
  push: boolean;
  email: boolean;
}

const DEFAULT_PREF: NotificationPref = { in_app: true, push: true, email: true };

export async function fetchNotificationPreferences(
  userId: string
): Promise<Map<NotificationType, NotificationPref>> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("notification_type, in_app, push, email")
    .eq("user_id", userId);

  const map = new Map<NotificationType, NotificationPref>();
  for (const row of data ?? []) {
    map.set(row.notification_type as NotificationType, {
      in_app: row.in_app,
      push: row.push,
      email: row.email,
    });
  }
  return map;
}

export function getPref(
  prefs: Map<NotificationType, NotificationPref>,
  type: NotificationType
): NotificationPref {
  return prefs.get(type) ?? DEFAULT_PREF;
}

export async function upsertNotificationPreference(
  userId: string,
  type: NotificationType,
  channel: "in_app" | "push" | "email",
  value: boolean
): Promise<void> {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        notification_type: type,
        [channel]: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,notification_type" }
    );
  if (error) throw error;
}

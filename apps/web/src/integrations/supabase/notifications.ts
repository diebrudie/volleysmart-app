import { supabase } from "./client";

export type NotificationType =
  | "club_join_request"
  | "club_join_accepted"
  | "club_join_rejected"
  | "club_member_joined"
  | "event_created"
  | "event_cancelled"
  | "event_rsvp"
  | "rsvp_deadline_reminder"
  | "game_started"
  | "club_member_left"
  | "club_member_removed";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

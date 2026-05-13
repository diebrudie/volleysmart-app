import { getSupabaseClient } from "./clientHolder";
import type { EventType } from "./plannedEvents";

export interface TemplateConfig {
  event_type?: EventType;
  title?: string;
  start_time?: string;
  end_time?: string;
  location_id?: string;
  max_players?: number;
  is_public?: boolean;
  notes?: string;
  rsvp_preset?: number;
}

export interface EventTemplate {
  id: string;
  user_id: string;
  club_id: string | null;
  name: string;
  config: TemplateConfig;
  created_at: string;
  updated_at: string;
}

export async function fetchEventTemplates(
  userId: string
): Promise<EventTemplate[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("event_templates")
    .select("*")
    .order("name");

  if (error) {
    console.warn("Could not fetch event templates:", error.message);
    return [];
  }
  return (data ?? []) as EventTemplate[];
}

export interface CreateTemplateInput {
  name: string;
  club_id: string | null;
  config: TemplateConfig;
}

export async function createEventTemplate(
  userId: string,
  input: CreateTemplateInput
): Promise<{ id: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("event_templates")
    .insert({
      user_id: userId,
      club_id: input.club_id,
      name: input.name,
      config: input.config,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function deleteEventTemplate(
  templateId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("event_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}

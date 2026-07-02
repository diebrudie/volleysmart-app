/**
 * Typed wrappers for Supabase RPCs promoted from the web app so both
 * platforms (web + mobile) can share them.
 *
 * NOTE: `leave_club` is intentionally NOT wrapped here — core already
 * exports `leaveClub(clubId)` from ./clubMembers.
 */
import { getSupabaseClient } from "./clientHolder";

/* ------------------------------------------------------------------ */
/* Helper for RPCs missing from the generated Database["Functions"]    */
/* (same pattern as ./members.ts callRpc)                              */
/* ------------------------------------------------------------------ */

type RpcResult<T> = { data: T | null; error: unknown };
type RpcCaller = (
  fn: string,
  params?: Record<string, unknown>
) => Promise<RpcResult<unknown>>;

async function callUntypedRpc<T>(
  fn: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const supabase = getSupabaseClient();
  const s = supabase as unknown as { rpc: RpcCaller };
  const { data, error } = await s.rpc(fn, params);
  if (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Unknown RPC error";
    throw new Error(message);
  }
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export interface EventAttendeeRow {
  player_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  primary_position: string | null;
}

/**
 * Attendee profiles for an event (SECURITY DEFINER RPC).
 * Works for the organizer + club members; returns [] for others.
 * Mirrors apps/web EventDetail.tsx `get_event_attendees` usage.
 */
export async function getEventAttendees(
  eventId: string
): Promise<EventAttendeeRow[]> {
  const rows = await callUntypedRpc<EventAttendeeRow[] | null>(
    "get_event_attendees",
    { p_event_id: eventId }
  );
  return rows ?? [];
}

/* ------------------------------------------------------------------ */
/* Clubs                                                               */
/* ------------------------------------------------------------------ */

/**
 * Active member count for a club. RPC bypasses club_members RLS so
 * non-members (e.g. public club pages) get a real count.
 * Mirrors apps/web ClubOverview.tsx `get_club_member_count` usage.
 */
export async function getClubMemberCount(clubId: string): Promise<number> {
  const count = await callUntypedRpc<number | null>("get_club_member_count", {
    p_club_id: clubId,
  });
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

/**
 * Permanently delete the current user's account (clears image_url and
 * deletes the auth user). Caller is responsible for best-effort storage
 * cleanup and for logging out afterwards (see apps/web Profile.tsx).
 */
export async function deleteOwnAccount(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Invitations                                                         */
/* ------------------------------------------------------------------ */

export interface InvitationValidation {
  valid: boolean;
  club_name: string | null;
  club_image: string | null;
  /** null (anon), "not_member", "already_member", "already_pending" */
  user_status: string | null;
}

/** Validate an invite token (works for anon + authenticated users). */
export async function validateInvitationToken(
  token: string
): Promise<InvitationValidation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("validate_invitation_token", {
    p_token: token,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (
    (row as InvitationValidation | undefined) ?? {
      valid: false,
      club_name: null,
      club_image: null,
      user_status: null,
    }
  );
}

export interface AcceptInvitationResult {
  club_name: string | null;
  /** e.g. "already_member" | "already_pending" | "pending_approval" */
  result_status: string | null;
}

/**
 * Accept an invite token. Throws the raw Supabase error on failure
 * (message contains "invitation_invalid" when the link is expired/revoked).
 */
export async function acceptInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (
    (row as AcceptInvitationResult | undefined) ?? {
      club_name: null,
      result_status: null,
    }
  );
}

export interface GeneratedInvitation {
  invitation_id: string;
  token: string;
}

/** Fetch-or-create the club's invite link token (admin only). */
export async function generateInvitation(
  clubId: string
): Promise<GeneratedInvitation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("generate_invitation", {
    p_club_id: clubId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("generate_invitation returned no row");
  return row as GeneratedInvitation;
}

/** Revoke an existing invitation (used before regenerating a link). */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("revoke_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
}

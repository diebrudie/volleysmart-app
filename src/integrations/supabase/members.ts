/**
 * Membership RPC wrappers (typings kept local to avoid tight coupling to generated types).
 * No new folder created, as requested.
 */
import { supabase } from "@/integrations/supabase/client";

export type ManageMemberRow = {
  membership_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: "admin" | "editor" | "member";
  status: "pending" | "active" | "removed" | "rejected";
  requested_at: string | null;
  activated_at: string | null;
  removed_at: string | null;
  rejected_at: string | null;
  removed_by: string | null;
};

/** Generic RPC caller that sidesteps generated RPC name unions */
type RpcResult<T> = { data: T; error: unknown | null };
type RpcCaller = (
  fn: string,
  params?: Record<string, unknown>
) => Promise<RpcResult<unknown>>;

async function callRpc<T>(
  fn: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  // Widen supabase to a minimal shape that supports the untyped RPC call
  const s = supabase as unknown as { rpc: RpcCaller };
  const { data, error } = await s.rpc(fn, params);

  if (error) {
    // Try to surface a useful error message
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Unknown RPC error";
    throw new Error(message);
  }

  return data as T;
}

export async function listManageMembers(p_club_id: string) {
  // manage_members_list returns rows
  return await callRpc<ManageMemberRow[]>("manage_members_list", { p_club_id });
}

export async function approveMembership(membershipId: string) {
  await callRpc<null>("approve_membership", { p_membership_id: membershipId });
}

export async function rejectMembership(membershipId: string) {
  await callRpc<null>("reject_membership", { p_membership_id: membershipId });
}

export async function removeMember(membershipId: string) {
  await callRpc<null>("remove_member", { p_membership_id: membershipId });
}

export async function changeMemberRole(
  membershipId: string,
  newRole: "admin" | "editor" | "member"
) {
  await callRpc<null>("change_member_role", {
    p_membership_id: membershipId,
    p_new_role: newRole,
  });
}

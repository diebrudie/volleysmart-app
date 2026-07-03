/**
 * Pending club-invite token persistence (mirrors web InvitePage.tsx /
 * Login.tsx / PlayerOnboarding.tsx `localStorage["pendingInviteToken"]`).
 *
 * When an unauthenticated user opens /invite/[token], the token is stored
 * so that after login (and onboarding, for brand-new users) we can route
 * them back to the invite screen and finish the join flow.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_INVITE_TOKEN_KEY = "pendingInviteToken";

export async function setPendingInviteToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
  } catch {
    // Non-fatal: the user can still open the invite link again.
  }
}

export async function getPendingInviteToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_INVITE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingInviteToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
  } catch {
    // Non-fatal.
  }
}

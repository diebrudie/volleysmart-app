import { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getSupabaseClient, deleteOwnAccount } from "@volleysmart/core";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** auth user id of the account being deleted. */
  userId: string | undefined;
  /** Current profile image URL — removed from storage best-effort. */
  imageUrl?: string | null;
};

/**
 * Destructive confirm dialog that deletes the current user's account.
 *
 * Mirrors apps/web Profile.tsx handleDeleteAccount:
 * 1. Guard: blocked while the user is admin of any club with 2+ members.
 * 2. Best-effort removal of the profile image from storage.
 * 3. delete_own_account RPC (core deleteOwnAccount), then sign out and
 *    route to login.
 */
export function DeleteAccountDialog({
  visible,
  onClose,
  userId,
  imageUrl,
}: Props) {
  const { t: tr } = useTranslation("profile");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!userId) return;
    setIsDeleting(true);
    const supabase = getSupabaseClient();
    try {
      // Block deletion if the user is admin of any club with 2+ members.
      const { data: adminClubs } = await supabase
        .from("club_members")
        .select("club_id, clubs(name)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("status", "active")
        .eq("role", "admin");

      if (adminClubs?.length) {
        for (const ac of adminClubs) {
          if (!ac.club_id) continue;
          const { count } = await supabase
            .from("club_members")
            .select("id", { count: "exact", head: true })
            .eq("club_id", ac.club_id)
            .eq("is_active", true)
            .eq("status", "active");

          if ((count ?? 0) >= 2) {
            const clubName = (ac.clubs as any)?.name ?? "a club";
            toast(
              tr("account.cantDeleteDescription", {
                defaultValue:
                  'You are the admin of "{{clubName}}" which has other members. Transfer admin role or remove members first.',
                clubName,
              }),
              "error"
            );
            onClose();
            return;
          }
        }
      }

      // Best-effort: delete the profile image from storage.
      if (imageUrl) {
        try {
          const url = new URL(imageUrl);
          const pathParts = url.pathname.split("/player-images/");
          if (pathParts[1]) {
            await supabase.storage
              .from("player-images")
              .remove([decodeURIComponent(pathParts[1])]);
          }
        } catch {
          // Storage cleanup is best-effort.
        }
      }

      await deleteOwnAccount();

      toast(
        tr("account.deletedTitle", { defaultValue: "Account deleted" }),
        "success"
      );

      await supabase.auth.signOut();
      router.replace("/(auth)/login" as never);
    } catch {
      toast(
        tr("toast.deleteAccountFailed", {
          defaultValue: "Failed to delete account. Please try again.",
        }),
        "error"
      );
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={tr("account.deleteTitle", {
        defaultValue: "Delete your account?",
      })}
      message={tr("account.deleteDescription", {
        defaultValue:
          "This will permanently delete your account and profile picture. You will lose access to the app. Your name and past activity will remain visible in event and game history.",
      })}
      confirmLabel={
        isDeleting
          ? tr("account.deleting", { defaultValue: "Deleting..." })
          : tr("account.deleteConfirm", { defaultValue: "Delete Account" })
      }
      cancelLabel={tr("toast.cancel", { defaultValue: "Cancel" })}
      destructive
      loading={isDeleting}
      onConfirm={handleConfirm}
    />
  );
}

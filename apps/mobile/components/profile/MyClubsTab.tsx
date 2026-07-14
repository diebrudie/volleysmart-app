import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSupabaseClient,
  leaveClub,
  updateMemberAssociation,
} from "@volleysmart/core";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { queryKeys } from "@/constants/queryKeys";
import { spacing, typography } from "@/constants/theme";
import { palette } from "@/constants/colors";

type ProfileClub = {
  membership_id: string;
  club_id: string;
  name: string;
  role: string;
  joined_at: string | null;
  member_association: boolean;
};

/** Mirrors the club_members query in apps/web Profile.tsx fetchUserClubs. */
async function fetchProfileClubs(userId: string): Promise<ProfileClub[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("club_members")
    .select(
      "id, club_id, role, joined_at, member_association, clubs!inner(name, status)"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active")
    .eq("clubs.status", "active");

  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    membership_id: m.id as string,
    club_id: m.club_id as string,
    name: (m.clubs as any)?.name as string,
    role: m.role as string,
    joined_at: m.joined_at as string | null,
    member_association: (m.member_association as boolean) ?? false,
  }));
}

export function MyClubsTab() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation("profile");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [leaveTarget, setLeaveTarget] = useState<ProfileClub | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const { data: clubs, isLoading } = useQuery({
    queryKey: queryKeys.profile.clubs(user?.id),
    queryFn: () => fetchProfileClubs(user!.id),
    enabled: !!user?.id,
  });

  const invalidateClubs = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.clubs(user?.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.clubs.mine(user?.id) });
  };

  const handleToggleAssociation = async (
    club: ProfileClub,
    newValue: boolean
  ) => {
    // Optimistic UI: update cache immediately, roll back on failure.
    queryClient.setQueryData<ProfileClub[]>(
      queryKeys.profile.clubs(user?.id),
      (prev) =>
        prev?.map((c) =>
          c.membership_id === club.membership_id
            ? { ...c, member_association: newValue }
            : c
        )
    );
    try {
      await updateMemberAssociation(club.membership_id, newValue);
      toast(
        newValue
          ? tr("clubs.markedAssociation", {
              defaultValue: "Marked as association member",
            })
          : tr("clubs.removedAssociation", {
              defaultValue: "Association membership removed",
            }),
        "success"
      );
    } catch {
      invalidateClubs();
      toast(
        tr("toast.updateAssociationFailed", {
          defaultValue: "Failed to update",
        }),
        "error"
      );
    }
  };

  const handleLeaveClub = async (club: ProfileClub) => {
    setIsLeaving(true);
    try {
      const supabase = getSupabaseClient();

      if (club.role === "admin") {
        // Admin: only allowed to "leave" by deleting a club they are the
        // sole member of (mirrors apps/web Profile.tsx).
        const { count } = await supabase
          .from("club_members")
          .select("id", { count: "exact", head: true })
          .eq("club_id", club.club_id)
          .eq("is_active", true)
          .eq("status", "active");

        if ((count ?? 0) > 1) {
          toast(
            tr("leaveClub.cantDeleteClubDescription", {
              defaultValue:
                "Remove all other members first, or transfer admin role.",
            }),
            "error"
          );
          return;
        }

        const { error } = await supabase
          .from("clubs")
          .update({ status: "deleted" as any })
          .eq("id", club.club_id);
        if (error) throw error;

        toast(
          tr("leaveClub.clubDeleted", { defaultValue: "Club deleted" }),
          "success"
        );
      } else {
        const { result_status } = await leaveClub(club.club_id);
        if (result_status === "sole_admin") {
          toast(
            tr("leaveClub.cantLeaveDescription", {
              defaultValue:
                "You are the only admin. Transfer admin role first.",
            }),
            "error"
          );
          return;
        }
        toast(
          tr("leaveClub.leftClub", { defaultValue: "Left club" }),
          "success"
        );
      }

      invalidateClubs();
    } catch {
      toast(
        tr("toast.leaveClubFailed", {
          defaultValue: "Failed to leave club",
        }),
        "error"
      );
    } finally {
      setIsLeaving(false);
      setLeaveTarget(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.list}>
        <Skeleton height={104} />
        <Skeleton height={104} />
      </View>
    );
  }

  if (!clubs?.length) {
    return (
      <View style={styles.empty}>
        <Text style={[typography.body, { color: t.textSecondary }]}>
          {tr("clubs.noClubs", {
            defaultValue: "Not a member of any club yet.",
          })}
        </Text>
      </View>
    );
  }

  const leaveTargetIsAdmin = leaveTarget?.role === "admin";

  return (
    <View style={styles.list}>
      <Text style={[styles.helpText, { color: t.textSecondary }]}>
        {tr("clubs.manageAssociations", {
          defaultValue: "Manage your club member associations",
        })}
      </Text>

      {clubs.map((club) => (
        <Card key={club.club_id} style={styles.clubCard}>
          <View style={styles.clubHeader}>
            <Pressable
              style={styles.clubInfo}
              accessibilityRole="button"
              onPress={() =>
                router.push(`/clubs/${club.club_id}`)
              }
            >
              <Text style={[styles.clubName, { color: t.text }]}>
                {club.name}
              </Text>
              <Text style={[styles.clubMeta, { color: t.textSecondary }]}>
                {club.joined_at
                  ? tr("clubs.memberSince", {
                      defaultValue: "Member since {{date}}",
                      date: new Date(club.joined_at).toLocaleDateString(
                        i18n.language,
                        { month: "long", year: "numeric" }
                      ),
                    })
                  : tr("clubs.member", { defaultValue: "Member" })}
                {" · "}
                <Text style={styles.roleText}>{club.role}</Text>
              </Text>
            </Pressable>
            {/* Club deletion lives only in the Clubs tab card menu; here
                admins get no delete option, non-admins can leave. */}
            {club.role !== "admin" ? (
              <Button
                title={tr("leaveClub.leaveClubConfirm", {
                  defaultValue: "Leave Club",
                })}
                variant="ghost"
                onPress={() => setLeaveTarget(club)}
                style={styles.leaveButton}
              />
            ) : null}
          </View>

          <View
            style={[styles.associationRow, { borderTopColor: t.cardBorder }]}
          >
            <Text style={[typography.body, { color: t.text }]}>
              {tr("clubs.memberAssociation", {
                defaultValue: "Member Association",
              })}
            </Text>
            <Switch
              value={club.member_association}
              onValueChange={(value) => handleToggleAssociation(club, value)}
              trackColor={{ false: t.muted, true: t.primary }}
              thumbColor={palette.white}
            />
          </View>
        </Card>
      ))}

      <Dialog
        visible={!!leaveTarget}
        onClose={() => setLeaveTarget(null)}
        title={
          leaveTargetIsAdmin
            ? tr("leaveClub.deleteClubTitle", { defaultValue: "Delete club?" })
            : tr("leaveClub.leaveClubTitle", { defaultValue: "Leave club?" })
        }
        message={
          leaveTargetIsAdmin
            ? tr("leaveClub.deleteClubDescription", {
                defaultValue:
                  "This club will be permanently deleted. This cannot be undone.",
              })
            : tr("leaveClub.leaveClubDescription", {
                defaultValue:
                  "You will no longer be a member of this club. You can request to join again later.",
              })
        }
        confirmLabel={
          leaveTargetIsAdmin
            ? tr("leaveClub.deleteClubConfirm", {
                defaultValue: "Delete Club",
              })
            : tr("leaveClub.leaveClubConfirm", { defaultValue: "Leave Club" })
        }
        destructive
        loading={isLeaving}
        onConfirm={() => leaveTarget && handleLeaveClub(leaveTarget)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingTop: spacing.lg },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  helpText: {
    ...typography.caption,
  },
  clubCard: { gap: spacing.md },
  clubHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  clubInfo: { flex: 1, gap: 2 },
  clubName: {
    ...typography.h3,
  },
  clubMeta: {
    ...typography.bodySm,
  },
  roleText: {
    textTransform: "capitalize",
  },
  leaveButton: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
  associationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
});

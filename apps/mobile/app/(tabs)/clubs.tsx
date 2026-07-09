import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getClubMemberCount,
  getSupabaseClient,
  type MemberClubWithDetails,
} from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useUserClubs } from "@/hooks/useUserClubs";
import { usePendingClubRequests } from "@/hooks/useDiscoverClubs";
import { ClubCard } from "@/components/ClubCard";
import { ClubSettingsSheet } from "@/components/clubs/ClubSettingsSheet";
import { DiscoverClubsSection } from "@/components/clubs/DiscoverClubsSection";
import { queryKeys } from "@/constants/queryKeys";
import { spacing, radii, typography, palette } from "@/constants/theme";
import { icons } from "@/constants/icons";

export default function ClubsScreen() {
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clubs, isLoading } = useUserClubs();
  const { data: pendingRequests = [] } = usePendingClubRequests();

  // Three-dots menu state (web Clubs.tsx admin popover: edit / delete).
  const [menuClub, setMenuClub] = useState<MemberClubWithDetails | null>(null);
  const [selectedClub, setSelectedClub] =
    useState<MemberClubWithDetails | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clubToDelete, setClubToDelete] =
    useState<MemberClubWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Member count per club (SECURITY DEFINER RPC), cached per club id.
  const memberCountQueries = useQueries({
    queries: (clubs ?? []).map((club) => ({
      queryKey: queryKeys.clubs.memberCount(club.club_id),
      queryFn: () => getClubMemberCount(club.club_id),
      staleTime: 60_000,
    })),
  });
  const memberCounts = new Map<string, number>();
  (clubs ?? []).forEach((club, i) => {
    const count = memberCountQueries[i]?.data;
    if (typeof count === "number") memberCounts.set(club.club_id, count);
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.mine(user?.id) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.pendingJoinRequests(user?.id),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allDiscover }),
    ]);
  }, [queryClient, user?.id]);

  const handleCreateClub = () => router.push("/clubs/create");

  // Admin check mirrors web Clubs.tsx isClubAdmin (role or creator).
  const isClubAdmin = (club: MemberClubWithDetails) =>
    club.role === "admin" || club.clubs?.created_by === user?.id;

  const handleEditClub = () => {
    if (!menuClub) return;
    setSelectedClub(menuClub);
    setMenuClub(null); // close the menu before the settings sheet opens
    setSettingsOpen(true);
  };

  const handleDeleteClub = () => {
    if (!menuClub) return;
    setClubToDelete(menuClub);
    setMenuClub(null); // close the menu before the confirm dialog opens
  };

  // Soft-delete (status="deleted"), mirroring web Clubs.tsx handleConfirmDelete.
  const handleConfirmDelete = async () => {
    if (!clubToDelete) return;
    setDeleting(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clubs")
        .update({ status: "deleted" })
        .eq("id", clubToDelete.club_id)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        // RLS silently blocked the update (no error, no rows).
        toast(
          t("toast.permissionError", {
            defaultValue: "You don't have permission to remove this club.",
          }),
          "error"
        );
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allMine }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.allDiscover,
        }),
      ]);
      toast(
        t("toast.removedDescription", {
          defaultValue: "The club is now removed from all members.",
        })
      );
    } catch {
      toast(
        t("toast.genericError", {
          defaultValue: "Failed to remove the club.",
        }),
        "error"
      );
    } finally {
      setDeleting(false);
      setClubToDelete(null);
    }
  };

  if (isLoading && !clubs) {
    return (
      <Screen scroll={false} safeTop={false}>
        <Spinner />
      </Screen>
    );
  }

  const hasClubs = (clubs ?? []).length > 0;

  return (
    <Screen safeTop={false} onRefresh={handleRefresh}>
      {/* Header: title + create CTA (web Clubs.tsx header) */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("title", { defaultValue: "Your Clubs" })}
        </Text>
        <Pressable
          onPress={handleCreateClub}
          style={({ pressed }) => [
            styles.createButton,
            {
              backgroundColor: pressed ? theme.primaryPressed : theme.primary,
            },
          ]}
        >
          <Ionicons name={icons.userPlus} size={14} color={palette.white} />
          <Text style={styles.createButtonText}>
            {t("createClub", { defaultValue: "Create Club" })}
          </Text>
        </Pressable>
      </View>

      {/* Your clubs */}
      {hasClubs ? (
        <View style={styles.list}>
          {(clubs ?? []).map((club) => (
            <ClubCard
              key={club.club_id}
              club={club}
              memberCount={memberCounts.get(club.club_id)}
              onPress={() => router.push(`/clubs/${club.club_id}`)}
              onMenuPress={
                isClubAdmin(club) ? () => setMenuClub(club) : undefined
              }
            />
          ))}
        </View>
      ) : pendingRequests.length === 0 ? (
        <EmptyState
          title={t("empty.title", { defaultValue: "No clubs yet" })}
          subtitle={t("emptyState", {
            defaultValue: "You haven't joined any clubs yet.",
          })}
        />
      ) : null}

      {/* Pending join requests (web Clubs.tsx pending section) */}
      {pendingRequests.length > 0 && (
        <View style={[styles.list, hasClubs && styles.pendingSpacing]}>
          {pendingRequests.map((req) => (
            <View
              key={req.club_id}
              style={[
                styles.pendingRow,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Avatar name={req.clubs?.name} size={48} />
              <View style={styles.pendingInfo}>
                <Text
                  style={[styles.pendingName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {req.clubs?.name ??
                    t("unknownClub", { defaultValue: "Unknown Club" })}
                </Text>
                {req.clubs?.city && (
                  <Text
                    style={[
                      styles.pendingCity,
                      { color: theme.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {req.clubs.city}
                  </Text>
                )}
              </View>
              <Badge
                label={t("pendingBadge", { defaultValue: "Pending" })}
                variant="warning"
              />
            </View>
          ))}
        </View>
      )}

      {/* Discover */}
      <View style={styles.discoverSpacing}>
        <DiscoverClubsSection />
      </View>

      {/* Club actions menu (admin three-dots; web Clubs.tsx popover) */}
      <Sheet
        visible={menuClub !== null}
        onClose={() => setMenuClub(null)}
        title={menuClub?.clubs?.name}
      >
        <Pressable
          onPress={handleEditClub}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.menuRow,
            { borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.surface },
          ]}
        >
          <Ionicons name={icons.pencil} size={18} color={theme.text} />
          <Text style={[styles.menuRowText, { color: theme.text }]}>
            {t("editClub", { defaultValue: "Edit Club" })}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleDeleteClub}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.menuRow,
            styles.menuRowLast,
            pressed && { backgroundColor: theme.surface },
          ]}
        >
          <Ionicons name={icons.trash2} size={18} color={theme.destructive} />
          <Text style={[styles.menuRowText, { color: theme.destructive }]}>
            {t("deleteClub", { defaultValue: "Delete Club" })}
          </Text>
        </Pressable>
      </Sheet>

      {/* Edit club (same settings sheet the club overview uses) */}
      {selectedClub?.clubs ? (
        <ClubSettingsSheet
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          club={{
            id: selectedClub.clubs.id,
            name: selectedClub.clubs.name,
            description: selectedClub.clubs.description ?? null,
            image_url: selectedClub.clubs.image_url,
            city: selectedClub.clubs.city ?? null,
            country: selectedClub.clubs.country ?? null,
            country_code: selectedClub.clubs.country_code ?? null,
            is_club_discoverable: !!selectedClub.clubs.is_club_discoverable,
            created_by: selectedClub.clubs.created_by,
          }}
        />
      ) : null}

      {/* Delete confirmation (web Clubs.tsx AlertDialog) */}
      <Dialog
        visible={clubToDelete !== null}
        onClose={() => setClubToDelete(null)}
        title={t("deleteDialog.title", { defaultValue: "Are you sure?" })}
        message={t("deleteDialog.description", {
          name: clubToDelete?.clubs?.name ?? "",
          defaultValue:
            'This action cannot be undone. This will permanently delete the club "{{name}}" and remove the club from everyone\'s view.',
        })}
        confirmLabel={t("deleteClub", { defaultValue: "Delete Club" })}
        cancelLabel={t("deleteDialog.cancel", { defaultValue: "Cancel" })}
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerTitle: { ...typography.h2 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 36,
  },
  createButtonText: {
    ...typography.bodySm,
    fontWeight: "600",
    color: palette.white,
  },
  list: { gap: spacing.md },
  pendingSpacing: { marginTop: spacing.lg },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  pendingInfo: { flex: 1, gap: 2 },
  pendingName: { ...typography.bodySm, fontWeight: "600" },
  pendingCity: { ...typography.caption },
  discoverSpacing: { marginTop: spacing.xxl },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuRowLast: { borderBottomWidth: 0, marginBottom: spacing.md },
  menuRowText: { ...typography.body, fontWeight: "500" },
});

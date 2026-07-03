import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { spacing, typography } from "@/constants/theme";

export type ClubGuest = {
  player_id: string;
  first_name: string;
  last_name: string;
};

type GuestRowRaw = {
  player_id: string;
  players: { first_name: string | null; last_name: string | null } | null;
};

/**
 * Guests for a club, ordered by last reuse. Mirrors the web
 * ClubOverview "club-guests" query (no core wrapper exists for guests).
 */
function useClubGuests(clubId: string | undefined, enabled: boolean) {
  return useQuery<ClubGuest[]>({
    queryKey: queryKeys.clubs.guests(clubId),
    enabled: !!clubId && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("guests")
        .select(
          "player_id, created_at, reused_at, players!inner(first_name, last_name)"
        )
        .eq("club_id", clubId!)
        .order("reused_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as GuestRowRaw[]).map((row) => ({
        player_id: row.player_id,
        first_name: row.players?.first_name ?? "Guest",
        last_name: row.players?.last_name ?? "Player",
      }));
    },
  });
}

type Props = {
  clubId: string;
  visible: boolean;
  onClose: () => void;
};

/**
 * Admin-only guests sheet. Lists the club's guest players and lets the
 * admin remove them (guest row + orphaned player row), mirroring the
 * web ClubOverview guests Sheet. Guests are created when starting a
 * game, so there is no "add guest" action here (web parity).
 */
export function GuestsSheet({ clubId, visible, onClose }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");
  const queryClient = useQueryClient();
  const { data: guests = [], isLoading } = useClubGuests(clubId, visible);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (guest: ClubGuest) => {
    if (removingId) return;
    setRemovingId(guest.player_id);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("player_id", guest.player_id)
        .eq("club_id", clubId);
      if (error) throw error;
      await supabase.from("players").delete().eq("id", guest.player_id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.guests(clubId),
      });
      toast(
        tr("overview.toasts.guestRemoved", { defaultValue: "Guest removed" })
      );
    } catch {
      toast(
        tr("overview.toasts.guestRemoveError", {
          defaultValue: "Failed to remove guest",
        }),
        "error"
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={tr("overview.guestsSheet.title", {
        defaultValue: "Guests ({{count}})",
        count: guests.length,
      })}
    >
      {isLoading ? (
        <View style={styles.loading}>
          <Spinner fullScreen={false} size="small" />
        </View>
      ) : guests.length > 0 ? (
        <View style={styles.list}>
          {guests.map((g, idx) => (
            <View
              key={g.player_id}
              style={[
                styles.row,
                idx < guests.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: t.border,
                },
              ]}
            >
              <Avatar name={`${g.first_name} ${g.last_name}`} size={36} />
              <Text
                numberOfLines={1}
                style={[styles.name, { color: t.text }]}
              >
                {g.first_name} {g.last_name}
              </Text>
              <Pressable
                onPress={() => handleRemove(g)}
                disabled={removingId !== null}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.removeButton,
                  (pressed || removingId === g.player_id) && styles.pressed,
                ]}
              >
                <Ionicons name={icons.trash2} size={16} color={t.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: t.textSecondary }]}>
            {tr("overview.guestsSheet.noGuestsTitle", {
              defaultValue: "No guests added yet.",
            })}
          </Text>
          <Text style={[styles.emptySubtitle, { color: t.textSecondary }]}>
            {tr("overview.guestsSheet.noGuestsDescription", {
              defaultValue: "Guests are added when starting a game.",
            })}
          </Text>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xxl },
  list: { paddingBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  name: { ...typography.body, fontWeight: "500", flex: 1 },
  removeButton: { padding: spacing.xs },
  pressed: { opacity: 0.6 },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.bodySm },
  emptySubtitle: { ...typography.caption, textAlign: "center" },
});

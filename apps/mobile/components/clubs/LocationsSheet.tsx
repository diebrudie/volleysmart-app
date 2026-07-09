import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type ClubLocation = {
  id: string;
  name: string;
  address: string | null;
};

/**
 * Saved event locations for a club. Mirrors the web ClubOverview
 * "club-locations" query (no core wrapper exists for locations).
 */
function useClubLocations(clubId: string | undefined, enabled: boolean) {
  return useQuery<ClubLocation[]>({
    queryKey: queryKeys.clubs.locations(clubId),
    enabled: !!clubId && enabled,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, address")
        .eq("club_id", clubId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ClubLocation[];
    },
  });
}

type Props = {
  clubId: string;
  visible: boolean;
  onClose: () => void;
};

/**
 * Admin "Saved Locations" bottom sheet — mirrors the web ClubOverview
 * locations sheet: list of saved event locations with inline delete
 * (no confirm dialog on web either, which also avoids stacking a second
 * RN Modal on top of this Sheet).
 */
export function LocationsSheet({ clubId, visible, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation("clubs");
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useClubLocations(
    clubId,
    visible
  );

  const handleDelete = async (locationId: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId);
    if (!error) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.locations(clubId),
      });
      toast(
        t("overview.toasts.locationRemoved", {
          defaultValue: "Location removed",
        })
      );
    } else {
      toast(
        t("overview.toasts.locationRemoveError", {
          defaultValue: "Failed to remove location.",
        }),
        "error"
      );
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("overview.locationsSheet.title", {
        defaultValue: "Saved Locations",
      })}
    >
      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.center}>
            <Spinner />
          </View>
        ) : locations.length > 0 ? (
          locations.map((loc, idx) => (
            <View
              key={loc.id}
              style={[
                styles.row,
                idx < locations.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: theme.muted }]}
              >
                <Ionicons
                  name={icons.mapPin}
                  size={16}
                  color={theme.mutedForeground}
                />
              </View>
              <View style={styles.rowText}>
                <Text
                  numberOfLines={1}
                  style={[styles.rowName, { color: theme.text }]}
                >
                  {loc.name}
                </Text>
                {loc.address ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rowAddress,
                      { color: theme.mutedForeground },
                    ]}
                  >
                    {loc.address}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleDelete(loc.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("overview.locationsSheet.remove", {
                  defaultValue: "Remove location",
                })}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Ionicons
                  name={icons.trash2}
                  size={16}
                  color={theme.danger}
                />
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.mutedForeground }]}>
              {t("overview.locationsSheet.noLocationsTitle", {
                defaultValue: "No saved locations.",
              })}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: theme.mutedForeground }]}
            >
              {t("overview.locationsSheet.noLocationsDescription", {
                defaultValue: "Locations are saved when creating events.",
              })}
            </Text>
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  center: { alignItems: "center", paddingVertical: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { ...typography.bodySm, fontWeight: "500" },
  rowAddress: { ...typography.caption },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.bodySm },
  emptySubtitle: { ...typography.caption, textAlign: "center" },
  pressed: { opacity: 0.6 },
});

/**
 * Edit-location bottom sheet for the game detail screen (R6-1/R6-2).
 *
 * Lets a club admin re-point a match day at one of the club's saved locations.
 * The options come from the canonical core `fetchClubLocations(clubId)` via
 * react-query (shared `clubs.locations` key), and picking one fires the
 * caller-provided `onSelect(locationId)` then closes.
 *
 * MODAL-NESTING RULE (CLAUDE.md): the location options are rendered INLINE as
 * pressable rows rather than via the Select primitive. Select owns its own
 * option Sheet (RN Modal) internally and does not expose that open-state, so a
 * Select placed inside this Sheet would stack two Modals and freeze — this
 * component is the single open Sheet, opened only after the menu Sheet fully
 * dismisses.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { fetchClubLocations } from "@volleysmart/core";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  clubId: string | null | undefined;
  /** Currently saved location, shown with a check mark. */
  currentLocationId: string | null;
  /** Fired with the chosen location id; caller runs the mutation. */
  onSelect: (locationId: string) => void;
};

export function EditLocationSheet({
  visible,
  onClose,
  clubId,
  currentLocationId,
  onSelect,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");

  const locationsQuery = useQuery({
    queryKey: queryKeys.clubs.locations(clubId ?? undefined),
    enabled: visible && !!clubId,
    queryFn: () => fetchClubLocations(clubId!),
  });
  const locations = locationsQuery.data ?? [];

  const handlePick = (locationId: string) => {
    onSelect(locationId);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("game.editLocation", { defaultValue: "Edit Location" })}
    >
      {locationsQuery.isLoading ? (
        <View style={styles.center}>
          <Spinner />
        </View>
      ) : locations.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name={icons.mapPin}
              size={40}
              color={theme.mutedForeground}
            />
          }
          title={t("game.noLocationsTitle", {
            defaultValue: "No saved locations",
          })}
          subtitle={t("game.noLocationsDescription", {
            defaultValue:
              "This club has no saved locations yet. Add one from the club page.",
          })}
        />
      ) : (
        <View style={styles.list}>
          {locations.map((loc) => {
            const selected = loc.id === currentLocationId;
            return (
              <Pressable
                key={loc.id}
                onPress={() => handlePick(loc.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: pressed ? theme.surface : "transparent" },
                  selected && { backgroundColor: theme.muted },
                ]}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>
                    {loc.name}
                  </Text>
                  {loc.address ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.optionAddress,
                        { color: theme.mutedForeground },
                      ]}
                    >
                      {loc.address}
                    </Text>
                  ) : null}
                </View>
                {selected ? (
                  <Ionicons name={icons.check} size={20} color={theme.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xl, alignItems: "center" },
  list: { gap: 2, paddingBottom: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { ...typography.body },
  optionAddress: { ...typography.bodySm },
});

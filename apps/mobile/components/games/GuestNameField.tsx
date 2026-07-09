/**
 * One temporary "guest" (extra player) row in the New Game screen.
 *
 * Mirrors the web NewGame extra-player row (apps/web/src/pages/NewGame.tsx
 * :779-811 + GuestNameSelector): a first-name field plus a position select.
 * The screen collects `{ name, position }` per guest and defaults the skill
 * rating to 5; the useCreateGame hook resolves the name to a real players.id
 * via createOrReuseGuestByName. Names are stripped of spaces here (guests are
 * stored first-name-only, matching web).
 *
 * The position picker is a `Select` (its own RN Modal). This row lives inside
 * the plain New Game ScrollView — never inside another Modal — so the picker
 * is the only open Modal and stays interactive (modal-nesting rule).
 */
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing } from "@/constants/theme";

export type GuestDraft = {
  /** Local-only id for list keying (not a players.id). */
  id: string;
  /** First name, spaces stripped. */
  name: string;
  /** English position name (normalized by the create hook). */
  position: string;
};

type Props = {
  value: GuestDraft;
  index: number;
  onChange: (patch: Partial<GuestDraft>) => void;
  onRemove: () => void;
  /** English position value + localized label. */
  positionOptions: readonly SelectOption<string>[];
};

export function GuestNameField({
  value,
  index,
  onChange,
  onRemove,
  positionOptions,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.cardBorder, backgroundColor: theme.card },
      ]}
    >
      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <Input
            label={t("game.newGame.guestNameLabel", {
              defaultValue: "Guest {{number}} name",
              number: index + 1,
            })}
            placeholder={t("game.newGame.guestNamePlaceholder", {
              defaultValue: "First name",
            })}
            value={value.name}
            autoCapitalize="words"
            onChangeText={(text) =>
              // Guests are first-name only; strip spaces (web parity).
              onChange({ name: text.replace(/\s+/g, "") })
            }
          />
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("game.newGame.removeGuest", {
            defaultValue: "Remove guest",
          })}
          style={({ pressed }) => [
            styles.removeButton,
            { borderColor: theme.cardBorder },
            pressed && { backgroundColor: theme.surface },
          ]}
        >
          <Ionicons name={icons.x} size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      <Select
        label={t("game.newGame.guestPositionLabel", {
          defaultValue: "Position",
        })}
        placeholder={t("game.newGame.guestPositionPlaceholder", {
          defaultValue: "Select a position",
        })}
        options={positionOptions}
        value={value.position}
        onChange={(v) => onChange({ position: v })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  nameField: { flex: 1 },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});

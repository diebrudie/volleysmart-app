/**
 * One set's score box for the Game detail screen.
 *
 * Mirrors the web SetBox (apps/web/src/components/match/SetBox.tsx): shows
 * "SET n" and the "a - b" score. For admins it is editable INLINE (tap the
 * edit affordance to reveal two numeric fields + Save/Cancel) — deliberately
 * NOT a modal, so it never stacks on top of the screen's confirm dialogs.
 * A 0-0 set is unplayed (rendered dimmed). Extra sets (>5) may be deleted;
 * deletion is confirmed by the parent (this only fires `onDelete`).
 */
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";
import { Button } from "@/components/ui/Button";

type Props = {
  setNumber: number;
  teamAScore: number | null;
  teamBScore: number | null;
  /** Admin/editor within the edit window: enables inline editing. */
  editable?: boolean;
  large?: boolean;
  saving?: boolean;
  onSave?: (teamAScore: number, teamBScore: number) => void;
  /** When set (extra sets only), shows a delete affordance that calls this. */
  onDelete?: () => void;
};

export function SetBox({
  setNumber,
  teamAScore,
  teamBScore,
  editable = false,
  large = false,
  saving = false,
  onSave,
  onDelete,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");

  const played =
    teamAScore !== null &&
    teamBScore !== null &&
    (teamAScore > 0 || teamBScore > 0);

  const [editing, setEditing] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  // Reset the draft whenever the box opens or the underlying score changes.
  useEffect(() => {
    setA(teamAScore && teamAScore > 0 ? String(teamAScore) : "");
    setB(teamBScore && teamBScore > 0 ? String(teamBScore) : "");
  }, [teamAScore, teamBScore, editing]);

  const openEdit = () => {
    setA(teamAScore && teamAScore > 0 ? String(teamAScore) : "");
    setB(teamBScore && teamBScore > 0 ? String(teamBScore) : "");
    setEditing(true);
  };

  const submit = () => {
    const av = parseInt(a, 10);
    const bv = parseInt(b, 10);
    onSave?.(Number.isFinite(av) ? av : 0, Number.isFinite(bv) ? bv : 0);
    setEditing(false);
  };

  const bg = played ? "rgba(251, 191, 36, 0.18)" : theme.muted;

  return (
    <View style={[styles.box, large && styles.boxLarge, { backgroundColor: bg }]}>
      {editable && !editing ? (
        <View style={styles.actions}>
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              accessibilityLabel={t("game.deleteSet", {
                defaultValue: "Delete set {{number}}",
                number: setNumber,
              })}
              style={styles.iconBtn}
            >
              <Ionicons name="trash-outline" size={18} color={theme.mutedForeground} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={openEdit}
            hitSlop={8}
            accessibilityLabel={t("game.editSet", {
              defaultValue: "Edit set {{number}}",
              number: setNumber,
            })}
            style={styles.iconBtn}
          >
            <Ionicons name="pencil" size={18} color={theme.mutedForeground} />
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.setLabel, { color: theme.text }]}>
        {t("game.setNumber", { defaultValue: "Set {{number}}", number: setNumber })}
      </Text>

      {editing ? (
        <View style={styles.editArea}>
          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: "#EF4444" }]}>
                {t("game.teamA", { defaultValue: "Team A" })}
              </Text>
              <TextInput
                value={a}
                onChangeText={setA}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: "#EF4444", backgroundColor: theme.inputBackground },
                ]}
              />
            </View>
            <Text style={[styles.vs, { color: theme.text }]}>vs.</Text>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: "#10B981" }]}>
                {t("game.teamB", { defaultValue: "Team B" })}
              </Text>
              <TextInput
                value={b}
                onChangeText={setB}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: "#10B981", backgroundColor: theme.inputBackground },
                ]}
              />
            </View>
          </View>
          <View style={styles.editButtons}>
            <Button
              title={t("game.cancel", { defaultValue: "Cancel" })}
              variant="outline"
              onPress={() => setEditing(false)}
              style={styles.editButton}
            />
            <Button
              title={t("game.save", { defaultValue: "Save" })}
              variant="primary"
              loading={saving}
              onPress={submit}
              style={styles.editButton}
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.score, large && styles.scoreLarge, { color: theme.text }]}>
            {played ? teamAScore : 0} - {played ? teamBScore : 0}
          </Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            {t("game.teamA", { defaultValue: "Team A" })} vs.{" "}
            {t("game.teamB", { defaultValue: "Team B" })}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  boxLarge: {
    paddingVertical: spacing.xxxl,
  },
  actions: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
    zIndex: 1,
  },
  iconBtn: {
    padding: 4,
  },
  setLabel: {
    ...typography.h3,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  score: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  scoreLarge: {
    fontSize: 34,
  },
  subtitle: {
    ...typography.bodySm,
  },
  editArea: {
    width: "100%",
    gap: spacing.md,
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.md,
  },
  inputCol: {
    alignItems: "center",
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  input: {
    width: 64,
    height: 52,
    borderWidth: 2,
    borderRadius: radii.md,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
  },
  vs: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  editButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
  },
});

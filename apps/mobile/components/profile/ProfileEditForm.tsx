import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getAllPositions } from "@volleysmart/core";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DateField } from "@/components/ui/DateField";
import { toast } from "@/components/ui/Toast";
import {
  PositionSelector,
  type Position,
} from "@/components/profile/PositionSelector";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useUpdatePlayer } from "@/hooks/useUpdatePlayer";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { queryKeys } from "@/constants/queryKeys";
import { radii, spacing, typography } from "@/constants/theme";
import { palette } from "@/constants/colors";

type PlayerPositionRow = {
  id: string;
  position_id: string;
  is_primary: boolean;
  positions: { id: string; name: string } | null;
};

type PlayerLike = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  image_url: string | null;
  gender: string | null;
  birthday: string | null;
  height_cm?: number | null;
  city?: string | null;
  player_positions?: PlayerPositionRow[] | null;
};

type Props = {
  player: PlayerLike;
  /** auth user id — used for the player-images upload path prefix. */
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
};

type Gender = "male" | "female" | "diverse" | "other";

function toDateString(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function ProfileEditForm({ player, userId, onSaved, onCancel }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("profile");
  const { pickAndUpload, uploading } = useMediaUpload();
  const updateMutation = useUpdatePlayer();

  const { data: positionsData } = useQuery({
    queryKey: queryKeys.positions.all,
    queryFn: getAllPositions,
    staleTime: 10 * 60 * 1000,
  });
  const positions: Position[] = useMemo(
    () =>
      (positionsData ?? [])
        .map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [positionsData]
  );

  const initial = useRef({
    firstName: player.first_name ?? "",
    lastName: player.last_name ?? "",
    height: player.height_cm != null ? String(player.height_cm) : "",
    gender: (player.gender ?? "other") as Gender,
    birthday: player.birthday ?? null,
    city: player.city ?? "",
    bio: player.bio ?? "",
    imageUrl: player.image_url ?? null,
    primaryId:
      player.player_positions?.find((pp) => pp.is_primary)?.position_id ??
      null,
    secondaryId:
      player.player_positions?.find((pp) => !pp.is_primary)?.position_id ??
      null,
  }).current;

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [height, setHeight] = useState(initial.height);
  const [gender, setGender] = useState<Gender>(initial.gender);
  const [birthday, setBirthday] = useState<Date | null>(
    parseDate(initial.birthday)
  );
  const [city, setCity] = useState(initial.city);
  const [bio, setBio] = useState(initial.bio);
  const [imageUrl, setImageUrl] = useState<string | null>(initial.imageUrl);
  const [primaryId, setPrimaryId] = useState<string | null>(initial.primaryId);
  const [secondaryId, setSecondaryId] = useState<string | null>(
    initial.secondaryId
  );

  const hasChanges =
    firstName !== initial.firstName ||
    lastName !== initial.lastName ||
    height !== initial.height ||
    gender !== initial.gender ||
    toDateString(birthday) !== initial.birthday ||
    city !== initial.city ||
    bio !== initial.bio ||
    imageUrl !== initial.imageUrl ||
    primaryId !== initial.primaryId ||
    secondaryId !== initial.secondaryId;

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || undefined;

  const handlePickImage = async () => {
    try {
      const url = await pickAndUpload("player-images", `${userId}-`);
      if (url) setImageUrl(url);
    } catch {
      toast(
        tr("toast.updateFailed", { defaultValue: "Failed to update profile" }),
        "error"
      );
    }
  };

  const handleSave = () => {
    const parsedHeight = height.trim() ? parseInt(height, 10) : null;
    updateMutation.mutate(
      {
        playerId: player.id,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim() || null,
          image_url: imageUrl,
          gender,
          birthday: toDateString(birthday),
          height_cm:
            parsedHeight != null && !Number.isNaN(parsedHeight)
              ? parsedHeight
              : null,
          city: city.trim() || null,
        },
        primaryPositionId: primaryId,
        secondaryPositionIds: secondaryId ? [secondaryId] : [],
      },
      {
        onSuccess: () => {
          toast(
            tr("toast.profileUpdated", { defaultValue: "Profile updated" }),
            "success"
          );
          onSaved();
        },
        onError: () => {
          toast(
            tr("toast.updateFailed", {
              defaultValue: "Failed to update profile",
            }),
            "error"
          );
        },
      }
    );
  };

  const genderOptions = [
    {
      value: "male" as const,
      label: tr("edit.genderMale", { defaultValue: "Male" }),
    },
    {
      value: "female" as const,
      label: tr("edit.genderFemale", { defaultValue: "Female" }),
    },
    {
      value: "diverse" as const,
      label: tr("edit.genderDiverse", { defaultValue: "Diverse" }),
    },
    {
      value: "other" as const,
      label: tr("edit.genderOther", { defaultValue: "Other" }),
    },
  ];

  return (
    <View style={styles.root}>
      {/* Avatar with upload badge */}
      <View style={styles.avatarWrap}>
        <Pressable
          onPress={handlePickImage}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={tr("avatarAlt", { defaultValue: "Profile" })}
        >
          <Avatar uri={imageUrl} name={fullName} size={80} />
          <View
            style={[styles.uploadBadge, { backgroundColor: t.primary }]}
          >
            <Ionicons
              name={uploading ? icons.refreshCw : icons.upload}
              size={14}
              color={palette.white}
            />
          </View>
        </Pressable>
      </View>

      {/* Names */}
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Input
            label={tr("edit.firstName", { defaultValue: "First Name" })}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.rowItem}>
          <Input
            label={tr("edit.lastName", { defaultValue: "Last Name" })}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>

      {/* Height + Gender */}
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Input
            label={tr("edit.height", { defaultValue: "Height (cm)" })}
            value={height}
            onChangeText={setHeight}
            keyboardType="number-pad"
            placeholder={tr("edit.heightPlaceholder", {
              defaultValue: "175",
            })}
          />
        </View>
        <View style={styles.rowItem}>
          <Select
            label={tr("edit.gender", { defaultValue: "Gender" })}
            options={genderOptions}
            value={gender}
            onChange={(value) => setGender(value)}
          />
        </View>
      </View>

      {/* Birthday */}
      <DateField
        label={tr("edit.birthday", { defaultValue: "Birthday" })}
        value={birthday}
        onChange={setBirthday}
      />

      {/* Location — plain text input (web uses a Mapbox city autocomplete) */}
      <Input
        label={tr("edit.location", { defaultValue: "Location" })}
        value={city}
        onChangeText={setCity}
        placeholder={tr("edit.locationPlaceholder", {
          defaultValue: "Start typing your city...",
        })}
        autoCapitalize="words"
      />

      {/* Bio */}
      <View>
        <Text style={[styles.bioLabel, { color: t.textSecondary }]}>
          {tr("edit.bio", { defaultValue: "Bio" })}
        </Text>
        {/* Raw TextInput: the Input primitive has a fixed-height row that
            does not grow for multiline content. Styled to match. */}
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder={tr("edit.bioPlaceholder", {
            defaultValue: "Tell us about yourself...",
          })}
          placeholderTextColor={t.placeholder}
          multiline
          textAlignVertical="top"
          style={[
            styles.bioInput,
            {
              color: t.text,
              borderColor: t.inputBorder,
              backgroundColor: t.inputBackground,
            },
          ]}
        />
      </View>

      {/* Positions */}
      <PositionSelector
        primaryPositionId={primaryId}
        secondaryPositionId={secondaryId}
        onChange={(nextPrimary, nextSecondary) => {
          setPrimaryId(nextPrimary);
          setSecondaryId(nextSecondary);
        }}
        positions={positions}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={tr("edit.cancel", { defaultValue: "Cancel" })}
          variant="outline"
          onPress={onCancel}
          style={styles.footerButton}
        />
        <Button
          title={
            updateMutation.isPending
              ? tr("edit.saving", { defaultValue: "Saving..." })
              : tr("edit.save", { defaultValue: "Save Changes" })
          }
          onPress={handleSave}
          disabled={!hasChanges || uploading}
          loading={updateMutation.isPending}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  avatarWrap: { alignItems: "center" },
  uploadBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", gap: spacing.md },
  rowItem: { flex: 1 },
  bioLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: spacing.xs + 2,
  },
  bioInput: {
    ...typography.body,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footerButton: { flex: 1 },
});

import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import {
  CityPicker,
  type CityLocationValue,
} from "@/components/clubs/CityPicker";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

export type ClubSettingsClub = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  is_club_discoverable: boolean;
  created_by: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  club: ClubSettingsClub;
};

const DESCRIPTION_MAX = 200;

/**
 * Admin club settings bottom sheet. Mirrors apps/web ClubSettingsDialog:
 * name, description (200 chars), photo picking (useMediaUpload), a
 * city-only Mapbox picker (CityPicker; country/country-code are captured
 * from the selection, never typed), discoverable toggle, save.
 *
 * Deliberately NO delete-club here — deleting lives on the Clubs page
 * card three-dots menu.
 */
export function ClubSettingsSheet({ visible, onClose, club }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");
  const queryClient = useQueryClient();
  const { pickAndUpload, uploading } = useMediaUpload();

  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? "");
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(club.image_url);
  const [city, setCity] = useState(club.city ?? "");
  const [country, setCountry] = useState(club.country ?? "");
  const [countryCode, setCountryCode] = useState(
    (club.country_code ?? "").toUpperCase()
  );
  const [isDiscoverable, setIsDiscoverable] = useState(
    !!club.is_club_discoverable
  );
  const [saving, setSaving] = useState(false);

  // Re-sync form state from the club each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setName(club.name);
    setDescription(club.description ?? "");
    setImageUrl(club.image_url);
    setCity(club.city ?? "");
    setCountry(club.country ?? "");
    setCountryCode((club.country_code ?? "").toUpperCase());
    setIsDiscoverable(!!club.is_club_discoverable);
  }, [visible, club]);

  const norm = (s: string): string | null => {
    const v = s.trim();
    return v.length ? v : null;
  };

  const hasChanges =
    name.trim() !== club.name ||
    description.trim() !== (club.description ?? "") ||
    imageUrl !== club.image_url ||
    city.trim() !== (club.city ?? "") ||
    country.trim() !== (club.country ?? "") ||
    countryCode.trim().toUpperCase() !==
      (club.country_code ?? "").toUpperCase() ||
    isDiscoverable !== !!club.is_club_discoverable;

  const handlePickImage = async () => {
    try {
      const url = await pickAndUpload("club-images", "clubs/");
      if (url) setImageUrl(url);
    } catch {
      toast(
        tr("settings.toastErrorDescription", {
          defaultValue: "Failed to update club",
        }),
        "error"
      );
    }
  };

  const handleCityTyping = (text: string) => {
    // Free typing invalidates the previous selection (mirrors web
    // CityLocationSelector onTextChange).
    setCity(text);
    setCountry("");
    setCountryCode("");
  };

  const handleCitySelect = (val: CityLocationValue) => {
    setCity(val.city);
    setCountry(val.country);
    setCountryCode(val.countryCode.toUpperCase());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const payload = {
        name: name.trim(),
        description: norm(description),
        image_url: imageUrl,
        city: norm(city),
        country: norm(country),
        country_code: norm(countryCode.toUpperCase()),
        is_club_discoverable: isDiscoverable,
      };
      const { data: updated, error } = await supabase
        .from("clubs")
        .update(payload)
        .eq("id", club.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) {
        toast(
          tr("settings.toastNotSavedDescription", {
            defaultValue: "No changes were persisted. Please try again.",
          }),
          "error"
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allMine });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.detail(club.id),
      });
      toast(
        tr("settings.toastSuccessDescription", {
          defaultValue: "Club updated successfully",
        })
      );
      onClose();
    } catch {
      toast(
        tr("settings.toastErrorDescription", {
          defaultValue: "Failed to update club",
        }),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={tr("settings.title", { defaultValue: "Club Settings" })}
      snapToContent={false}
      footer={
        <View style={styles.buttons}>
          <Button
            title={tr("settings.cancel", { defaultValue: "Cancel" })}
            variant="outline"
            onPress={onClose}
            style={styles.button}
          />
          <Button
            title={tr("settings.saveChanges", {
              defaultValue: "Save Changes",
            })}
            loading={saving}
            disabled={!name.trim() || !hasChanges || uploading}
            onPress={handleSave}
            style={styles.button}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <Input
          label={tr("settings.clubName", { defaultValue: "Club Name" })}
          value={name}
          onChangeText={setName}
          style={styles.inputText}
          placeholder={tr("settings.clubNamePlaceholder", {
            defaultValue: "Enter club name",
          })}
        />

        {/* Description — own multiline block (the shared Input row is
            fixed-height and makes a tall TextInput overlap siblings). */}
        <View style={styles.descriptionBlock}>
          <Text style={[styles.label, { color: t.textSecondary }]}>
            {tr("settings.description", {
              defaultValue: "Description / Notes (optional)",
            })}
          </Text>
          <View
            style={[
              styles.textareaWrap,
              {
                backgroundColor: t.inputBackground,
                borderColor: descriptionFocused ? t.primary : t.inputBorder,
              },
            ]}
          >
            <TextInput
              value={description}
              onChangeText={(text) => {
                if (text.length <= DESCRIPTION_MAX) setDescription(text);
              }}
              onFocus={() => setDescriptionFocused(true)}
              onBlur={() => setDescriptionFocused(false)}
              placeholder={tr("settings.descriptionPlaceholder", {
                defaultValue: "Tell people about your club…",
              })}
              placeholderTextColor={t.placeholder}
              multiline
              textAlignVertical="top"
              style={[styles.textarea, { color: t.text }]}
            />
          </View>
          <Text style={[styles.counter, { color: t.mutedForeground }]}>
            {description.length}/{DESCRIPTION_MAX}
          </Text>
        </View>

        {/* Club image */}
        <View style={styles.imageSection}>
          <Text style={[styles.label, { color: t.textSecondary }]}>
            {tr("settings.clubImage", { defaultValue: "Club Image" })}
          </Text>
          <View style={styles.imageRow}>
            <Pressable
              onPress={handlePickImage}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={tr("settings.uploadPhoto", {
                defaultValue: "Pick a photo",
              })}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={[styles.imagePreview, { borderColor: t.border }]}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.imagePlaceholder,
                    { backgroundColor: t.muted, borderColor: t.border },
                  ]}
                >
                  <Ionicons
                    name={icons.camera}
                    size={22}
                    color={t.mutedForeground}
                  />
                </View>
              )}
            </Pressable>
            <View style={styles.imageActions}>
              <Button
                title={
                  imageUrl
                    ? tr("settings.changePhoto", {
                        defaultValue: "Change Photo",
                      })
                    : tr("settings.pickPhoto", {
                        defaultValue: "Pick a photo",
                      })
                }
                variant="outline"
                loading={uploading}
                onPress={handlePickImage}
              />
              {imageUrl ? (
                <Pressable
                  onPress={() => setImageUrl(null)}
                  hitSlop={6}
                  accessibilityRole="button"
                >
                  <Text style={[styles.removeImage, { color: t.danger }]}>
                    {tr("newClub.removeImage", {
                      defaultValue: "Remove image",
                    })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* Location — city-only Mapbox picker (mirrors web
            CityLocationSelector; country + code come from the selection).
            The "?" help matches the PWA's cityHelp popover. */}
        <View style={styles.field}>
          <HelpLabel
            label={tr("settings.manualCity", { defaultValue: "City" })}
            help={tr("settings.cityHelp", {
              defaultValue:
                "Please make sure you select a City from the dropdown.",
            })}
            labelColor={t.textSecondary}
          />
          <CityPicker
            placeholder={tr("settings.cityPlaceholder", {
              defaultValue: "Start typing a city...",
            })}
            inputStyle={styles.inputText}
            city={city}
            selectedCountry={country || null}
            onCityChange={handleCityTyping}
            onSelect={handleCitySelect}
          />
        </View>

        {/* Discoverability toggle — "?" help matches the PWA popover. */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <HelpLabel
              label={tr("settings.discoverableLabel", {
                defaultValue: "Make this club discoverable",
              })}
              help={tr("settings.discoverableHelp", {
                defaultValue:
                  "If enabled, others can find this club on the Discovery page.",
              })}
              labelColor={t.text}
            />
          </View>
          <Switch
            value={isDiscoverable}
            onValueChange={setIsDiscoverable}
            trackColor={{ false: t.border, true: t.primary }}
          />
        </View>
      </View>
    </Sheet>
  );
}

/**
 * Field label with a tappable "?" that toggles an inline helper note.
 * A Sheet-safe replacement for the PWA's HelpCircle popover — an inline
 * note avoids stacking a second RN Modal on top of the settings Sheet.
 */
function HelpLabel({
  label,
  help,
  labelColor,
}: {
  label: string;
  help: string;
  labelColor: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.helpLabelWrap}>
      <View style={styles.helpLabelRow}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${label} help`}
        >
          <Ionicons
            name="help-circle-outline"
            size={16}
            color={t.mutedForeground}
          />
        </Pressable>
      </View>
      {open ? (
        <Text style={[styles.helpText, { color: t.mutedForeground }]}>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // spacing.lg (16) between fields; label→input gaps use spacing.sm (8).
  form: { gap: spacing.lg, paddingBottom: spacing.xs },
  label: { fontSize: 14, fontWeight: "500" },
  // Input text sized down to 15 (was 16) per device feedback.
  inputText: { fontSize: 15 },
  field: { gap: spacing.sm },
  helpLabelWrap: { gap: spacing.xs },
  helpLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  helpText: { ...typography.caption, lineHeight: 16 },
  descriptionBlock: { gap: spacing.sm },
  textareaWrap: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
  },
  textarea: {
    fontSize: 15,
    minHeight: 84,
    maxHeight: 160,
    padding: 0,
  },
  counter: {
    ...typography.caption,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  imageSection: { gap: spacing.sm },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  imagePreview: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageActions: { gap: spacing.sm, alignItems: "flex-start" },
  removeImage: { ...typography.caption, fontWeight: "500" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toggleText: { flex: 1 },
  buttons: { flexDirection: "row", gap: spacing.md },
  button: { flex: 1 },
});

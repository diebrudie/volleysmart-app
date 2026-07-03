import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Sheet } from "@/components/ui/Sheet";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
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
  /** Current user id — delete is offered to the creator/admin opening this sheet. */
  currentUserId?: string;
};

const DESCRIPTION_MAX = 200;

/**
 * Admin club settings bottom sheet. Mirrors apps/web
 * ClubSettingsDialog: name, description (200 chars), image upload,
 * manual city/country/code, discoverable toggle, save. Adds the
 * delete-club flow from apps/web Profile.tsx (sole member only,
 * soft-delete status="deleted").
 */
export function ClubSettingsSheet({ visible, onClose, club }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");
  const { t: trProfile } = useTranslation("profile");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pickAndUpload, uploading } = useMediaUpload();

  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? "");
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["user-clubs"] });
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const supabase = getSupabaseClient();
      // Mirror web Profile.tsx: only a sole member may delete the club.
      const { count } = await supabase
        .from("club_members")
        .select("id", { count: "exact", head: true })
        .eq("club_id", club.id)
        .eq("is_active", true)
        .eq("status", "active");
      if ((count ?? 0) > 1) {
        toast(
          trProfile("leaveClub.cantDeleteClubDescription", {
            defaultValue:
              "Remove all other members before deleting this club.",
          }),
          "error"
        );
        return;
      }
      const { error } = await supabase
        .from("clubs")
        .update({ status: "deleted" })
        .eq("id", club.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user-clubs"] });
      toast(
        trProfile("leaveClub.clubDeleted", { defaultValue: "Club deleted" })
      );
      setDeleteOpen(false);
      onClose();
      router.replace("/(tabs)/clubs" as never);
    } catch {
      toast(
        tr("settings.toastErrorDescription", {
          defaultValue: "Failed to update club",
        }),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={tr("settings.title", { defaultValue: "Club Settings" })}
        snapToContent={false}
      >
        <View style={styles.form}>
          <Input
            label={tr("settings.clubName", { defaultValue: "Club Name" })}
            value={name}
            onChangeText={setName}
            placeholder={tr("settings.clubNamePlaceholder", {
              defaultValue: "Enter club name",
            })}
          />

          <View>
            <Input
              label={tr("settings.description", {
                defaultValue: "Description / Notes (optional)",
              })}
              value={description}
              onChangeText={(text) => {
                if (text.length <= DESCRIPTION_MAX) setDescription(text);
              }}
              placeholder={tr("settings.descriptionPlaceholder", {
                defaultValue: "Tell people about your club…",
              })}
              multiline
              numberOfLines={3}
              style={styles.multiline}
            />
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
                    name={icons.image}
                    size={22}
                    color={t.mutedForeground}
                  />
                </View>
              )}
              <View style={styles.imageActions}>
                <Button
                  title={
                    imageUrl
                      ? tr("settings.changePhoto", {
                          defaultValue: "Change Photo",
                        })
                      : tr("settings.uploadPhoto", {
                          defaultValue: "Upload Photo",
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

          {/* Location (manual entry — no Mapbox on mobile) */}
          <Input
            label={tr("settings.manualCity", { defaultValue: "City" })}
            value={city}
            onChangeText={setCity}
            placeholder={tr("settings.manualCityPlaceholder", {
              defaultValue: "e.g., Berlin",
            })}
          />
          <View style={styles.countryRow}>
            <View style={styles.countryField}>
              <Input
                label={tr("settings.manualCountry", {
                  defaultValue: "Country",
                })}
                value={country}
                onChangeText={setCountry}
                placeholder={tr("settings.manualCountryPlaceholder", {
                  defaultValue: "e.g., Germany",
                })}
              />
            </View>
            <View style={styles.codeField}>
              <Input
                label={tr("settings.manualCountryCode", {
                  defaultValue: "Country code",
                })}
                value={countryCode}
                onChangeText={(v) => setCountryCode(v.toUpperCase())}
                placeholder={tr("settings.manualCountryCodePlaceholder", {
                  defaultValue: "e.g., DE",
                })}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
          </View>

          {/* Discoverability toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={[styles.label, { color: t.text }]}>
                {tr("settings.discoverableLabel", {
                  defaultValue: "Make this club discoverable",
                })}
              </Text>
              <Text style={[styles.toggleHelp, { color: t.mutedForeground }]}>
                {tr("settings.discoverableHelp", {
                  defaultValue:
                    "If enabled, others can find this club on the Discovery page.",
                })}
              </Text>
            </View>
            <Switch
              value={isDiscoverable}
              onValueChange={setIsDiscoverable}
              trackColor={{ false: t.border, true: t.primary }}
            />
          </View>

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

          {/* Danger zone */}
          <View style={[styles.dangerZone, { borderTopColor: t.border }]}>
            <Pressable
              onPress={() => setDeleteOpen(true)}
              hitSlop={6}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.deleteRow,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={icons.trash2} size={16} color={t.danger} />
              <Text style={[styles.deleteText, { color: t.danger }]}>
                {tr("deleteClub", { defaultValue: "Delete Club" })}
              </Text>
            </Pressable>
            <Text style={[styles.deleteHint, { color: t.mutedForeground }]}>
              {trProfile("leaveClub.deleteClubDescription", {
                defaultValue:
                  "This club will be permanently deleted. This cannot be undone.",
              })}
            </Text>
          </View>
        </View>
      </Sheet>

      <Dialog
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={trProfile("leaveClub.deleteClubTitle", {
          defaultValue: "Delete club?",
        })}
        message={trProfile("leaveClub.deleteClubDescription", {
          defaultValue:
            "This club will be permanently deleted. This cannot be undone.",
        })}
        confirmLabel={trProfile("leaveClub.deleteClubConfirm", {
          defaultValue: "Delete Club",
        })}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingBottom: spacing.xxl },
  multiline: { height: 84, paddingTop: spacing.md },
  counter: {
    ...typography.caption,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  label: { fontSize: 14, fontWeight: "500" },
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
  countryRow: { flexDirection: "row", gap: spacing.md },
  countryField: { flex: 2 },
  codeField: { flex: 1 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleHelp: { ...typography.caption, lineHeight: 16 },
  buttons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  button: { flex: 1 },
  dangerZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  deleteText: { ...typography.bodySm, fontWeight: "600" },
  deleteHint: { ...typography.caption, lineHeight: 16 },
  pressed: { opacity: 0.7 },
});

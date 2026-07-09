import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { getPublicUrl } from "@volleysmart/core";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useCreateClub } from "@/hooks/useCreateClub";
import { spacing, radii, typography, palette } from "@/constants/theme";
import { icons } from "@/constants/icons";

const INDOOR_IMAGES = Array.from(
  { length: 10 },
  (_, i) => `defaults/img-volleyball-indoor-${String(i + 1).padStart(2, "0")}.jpg`
);
const BEACH_IMAGES = Array.from(
  { length: 10 },
  (_, i) => `defaults/img-volleyball-beach-${String(i + 1).padStart(2, "0")}.jpg`
);

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

/**
 * Create Club form, mirroring apps/web/src/pages/NewClub.tsx:
 * name, description (200 chars), city, default-image picker or custom
 * upload, discoverable toggle. Deviation: the web Mapbox city picker is
 * web-only, so city is a plain text input (country/country_code stay null).
 */
export default function CreateClubScreen() {
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const { pickAndUpload, uploading } = useMediaUpload();
  const createClub = useCreateClub();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [selectedDefaultUrl, setSelectedDefaultUrl] = useState<string | null>(
    null
  );
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const defaultImages = useMemo(() => {
    const indoor = shuffle(INDOOR_IMAGES).slice(0, 3);
    const beach = shuffle(BEACH_IMAGES).slice(0, 2);
    return shuffle([...indoor, ...beach]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleSelectDefault = (path: string) => {
    const url = getPublicUrl("club-images", path);
    if (selectedDefaultUrl === url) {
      setSelectedDefaultUrl(null);
    } else {
      setSelectedDefaultUrl(url);
      setUploadedUrl(null);
    }
  };

  const handleUpload = async () => {
    try {
      const url = await pickAndUpload("club-images", "clubs/");
      if (url) {
        setUploadedUrl(url);
        setSelectedDefaultUrl(null);
      }
    } catch (err) {
      console.error("Image upload error:", err);
      toast(
        t("newClub.toastImageFailed", {
          defaultValue:
            "Image upload failed, but club will be created without an image.",
        }),
        "error"
      );
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError(
        t("newClub.clubNameRequired", {
          defaultValue: "Club name is required",
        })
      );
      return;
    }
    setNameError(undefined);

    try {
      const newClubId = await createClub.mutateAsync({
        name,
        description,
        city,
        imageUrl: uploadedUrl ?? selectedDefaultUrl,
        isDiscoverable,
      });
      toast(
        t("newClub.toastCreatedTitle", { defaultValue: "Club created!" })
      );
      router.replace(`/clubs/${newClubId}`);
    } catch (err) {
      console.error("Error creating club:", err);
      toast(
        t("newClub.toastDefaultError", {
          defaultValue: "Failed to create club. Please try again.",
        }),
        "error"
      );
    }
  };

  const imagePreview = uploadedUrl;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t("newClub.title", { defaultValue: "Create a Club" })}
      />
      <KeyboardAwareScreen safeTop={false}>
        <View style={styles.form}>
          {/* Club name */}
          <Input
            label={t("newClub.clubName", { defaultValue: "Club Name" })}
            placeholder={t("newClub.clubNamePlaceholder", {
              defaultValue: "e.g., Beach Volleyball Berlin",
            })}
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (nameError && v.trim()) setNameError(undefined);
            }}
            error={nameError}
          />

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t("newClub.description", {
                defaultValue: "Description (optional)",
              })}
            </Text>
            <TextInput
              placeholder={t("newClub.descriptionPlaceholder", {
                defaultValue: "Tell people about your club...",
              })}
              placeholderTextColor={theme.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
              style={[
                styles.textArea,
                {
                  color: theme.text,
                  borderColor: theme.inputBorder,
                  backgroundColor: theme.inputBackground,
                },
              ]}
            />
            <Text style={[styles.counter, { color: theme.mutedForeground }]}>
              {description.length}/200
            </Text>
          </View>

          {/* City (plain input; web's Mapbox picker is web-only) */}
          <Input
            label={t("settings.manualCity", { defaultValue: "City" })}
            placeholder={t("newClub.cityPlaceholder", {
              defaultValue: "Type the city your Club is located...",
            })}
            value={city}
            onChangeText={setCity}
          />

          {/* Club image */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t("newClub.clubImage", { defaultValue: "Club Image" })}
            </Text>

            {/* Default image grid */}
            <View style={styles.gridHeader}>
              <Text style={[styles.hint, { color: theme.mutedForeground }]}>
                {t("newClub.pickDefault", { defaultValue: "Pick a photo" })}
              </Text>
              <Pressable
                onPress={() => {
                  setRefreshKey((k) => k + 1);
                  setSelectedDefaultUrl(null);
                }}
                hitSlop={8}
              >
                <Ionicons
                  name={icons.refreshCw}
                  size={16}
                  color={theme.mutedForeground}
                />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {defaultImages.map((path) => {
                const url = getPublicUrl("club-images", path);
                const isSelected = selectedDefaultUrl === url && !uploadedUrl;
                return (
                  <Pressable
                    key={path}
                    onPress={() => handleSelectDefault(path)}
                    style={[
                      styles.gridItem,
                      {
                        borderColor: isSelected
                          ? theme.primary
                          : theme.cardBorder,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.gridImage}
                      contentFit="cover"
                      transition={150}
                    />
                    {isSelected && (
                      <View
                        style={[
                          styles.gridSelectedOverlay,
                          { backgroundColor: theme.overlay },
                        ]}
                      >
                        <View
                          style={[
                            styles.gridCheck,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <Ionicons
                            name={icons.check}
                            size={14}
                            color={palette.white}
                          />
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
              <Text style={[styles.hint, { color: theme.mutedForeground }]}>
                {t("newClub.orUpload", { defaultValue: "or upload your own" })}
              </Text>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
            </View>

            {/* Custom upload */}
            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              style={[
                styles.uploadButton,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.muted,
                  opacity: uploading ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons
                name={icons.upload}
                size={16}
                color={theme.mutedForeground}
              />
              <Text style={[styles.uploadText, { color: theme.text }]}>
                {uploading
                  ? t("newClub.uploading", { defaultValue: "Uploading..." })
                  : imagePreview
                    ? t("newClub.changePhoto", { defaultValue: "Change Photo" })
                    : t("newClub.uploadPhoto", { defaultValue: "Upload Photo" })}
              </Text>
            </Pressable>

            {imagePreview && (
              <View style={styles.previewRow}>
                <Image
                  source={{ uri: imagePreview }}
                  style={[styles.preview, { borderColor: theme.cardBorder }]}
                  contentFit="cover"
                />
                <Pressable onPress={() => setUploadedUrl(null)} hitSlop={8}>
                  <Text style={[styles.removeText, { color: theme.danger }]}>
                    {t("newClub.removeImage", { defaultValue: "Remove" })}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Discoverable toggle */}
          <View style={[styles.switchRow, { borderTopColor: theme.border }]}>
            <View style={styles.switchLabelWrap}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>
                {t("newClub.discoverableLabel", {
                  defaultValue: "Make this club discoverable",
                })}
              </Text>
              <Text style={[styles.hint, { color: theme.mutedForeground }]}>
                {t("newClub.discoverableHelp", {
                  defaultValue:
                    "If enabled, others can find this club on the Discover page.",
                })}
              </Text>
            </View>
            <Switch
              value={isDiscoverable}
              onValueChange={setIsDiscoverable}
              trackColor={{ false: theme.muted, true: theme.primary }}
              thumbColor={palette.white}
            />
          </View>

          {/* Submit */}
          <Button
            title={
              createClub.isPending
                ? t("newClub.creating", { defaultValue: "Creating..." })
                : t("newClub.createClub", { defaultValue: "Create Club" })
            }
            onPress={handleSubmit}
            loading={createClub.isPending}
            disabled={uploading}
          />
        </View>
      </KeyboardAwareScreen>
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl, paddingTop: spacing.lg },
  field: { gap: spacing.xs },
  label: { ...typography.bodySm, fontWeight: "500" },
  textArea: {
    ...typography.body,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.md,
    textAlignVertical: "top",
  },
  counter: { ...typography.caption, textAlign: "right" },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hint: { ...typography.caption, flexShrink: 1 },
  grid: { flexDirection: "row", gap: spacing.sm },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    overflow: "hidden",
  },
  gridImage: { width: "100%", height: "100%" },
  gridSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCheck: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  uploadText: { ...typography.bodySm, fontWeight: "500" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  preview: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  removeText: { ...typography.caption, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.lg,
  },
  switchLabelWrap: { flex: 1, gap: spacing.xs },
  switchLabel: { ...typography.bodySm, fontWeight: "500" },
});

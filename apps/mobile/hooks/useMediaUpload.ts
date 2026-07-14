import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { getSupabaseClient } from "@volleysmart/core";

/**
 * Pick an image from the library and upload it to Supabase Storage.
 *
 * Path conventions match the web app — `pathPrefix` is a RAW prefix that is
 * concatenated (not joined) with `${Date.now()}.${ext}`:
 * - Club images (apps/web NewClub.tsx):    pickAndUpload("club-images", "clubs/")
 *   → club-images/clubs/1719930000000.jpg
 * - Player images (apps/web Profile.tsx):  pickAndUpload("player-images", `${userId}-`)
 *   → player-images/<userId>-1719930000000.jpg
 *
 * Returns the public URL of the uploaded file, or null when the user
 * cancels the picker. Throws on upload failure.
 */
export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(
    async (bucket: string, pathPrefix: string): Promise<string | null> => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      setUploading(true);
      try {
        // Derive extension: fileName > mimeType > uri, defaulting to jpg
        const fromName = asset.fileName?.split(".").pop()?.toLowerCase();
        const fromMime = asset.mimeType?.split("/").pop()?.toLowerCase();
        const fromUri = asset.uri.includes(".")
          ? asset.uri.split(".").pop()?.toLowerCase()
          : undefined;
        const rawExt = fromName || fromMime || fromUri || "jpg";
        const ext = rawExt === "jpeg" ? "jpg" : rawExt;

        const filePath = `${pathPrefix}${Date.now()}.${ext}`;
        const contentType =
          asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;

        // fetch() the local/blob uri and upload raw bytes (works on
        // native and react-native-web).
        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();

        const supabase = getSupabaseClient();
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, arrayBuffer, { contentType });
        if (error) throw error;

        return supabase.storage.from(bucket).getPublicUrl(filePath).data
          .publicUrl;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { pickAndUpload, uploading };
}

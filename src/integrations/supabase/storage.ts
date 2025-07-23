import { supabase } from "./client";

/**
 * Get public URL for a file in storage
 */
export const getPublicUrl = (bucketName: string, filePath: string): string => {
  return supabase.storage.from(bucketName).getPublicUrl(filePath).data
    .publicUrl;
};

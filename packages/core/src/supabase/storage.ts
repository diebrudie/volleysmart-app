import { getSupabaseClient } from "./clientHolder";

export const getPublicUrl = (bucketName: string, filePath: string): string => {
  const supabase = getSupabaseClient();
  return supabase.storage.from(bucketName).getPublicUrl(filePath).data
    .publicUrl;
};

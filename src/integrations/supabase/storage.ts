import { supabase } from './client';

/**
 * Checks if a specific Supabase storage bucket exists.
 * Logs a warning if it doesn't, but does NOT attempt to create it.
 */
export const verifyStorageBucket = async (bucketName: string): Promise<void> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error(`Error fetching bucket list:`, error);
      return;
    }

    const exists = buckets.some(bucket => bucket.name === bucketName);
    if (!exists) {
      console.warn(`🚨 Bucket "${bucketName}" does not exist. Please create it manually in Supabase.`);
    } else {
      console.log(`✅ Bucket "${bucketName}" verified.`);
    }
  } catch (error) {
    console.error('Unexpected error in verifyStorageBucket:', error);
  }
};

/**
 * Get a public URL for a file stored in Supabase storage.
 * @param bucketName The name of the bucket (e.g., 'player-images' or 'club-images')
 * @param filePath The path to the file inside the bucket
 * @returns The public URL as a string
 */
export const getPublicUrl = (bucketName: string, filePath: string): string => {
  return supabase.storage.from(bucketName).getPublicUrl(filePath).data.publicUrl;
};

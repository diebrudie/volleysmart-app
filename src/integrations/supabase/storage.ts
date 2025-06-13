
import { supabase } from './client';

export enum StorageBuckets {
  ClubImages = 'club-images'
}

/**
 * Ensures the storage bucket exists, logs a warning if not
 */
export const ensureStorageBucketExists = async (bucketName: string): Promise<void> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Error checking storage buckets:', error);
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      console.warn(`Bucket "${bucketName}" does not exist. Please create it manually in Supabase.`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }
  } catch (error) {
    console.error('Error in ensureStorageBucketExists:', error);
  }
};

/**
 * Get public URL for a file in storage
 */
export const getPublicUrl = (bucketName: string, filePath: string): string => {
  return supabase.storage.from(bucketName).getPublicUrl(filePath).data.publicUrl;
};

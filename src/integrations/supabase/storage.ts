
import { supabase } from './client';

/**
 * Ensures that the storage bucket exists, creates it if it doesn't
 * @param bucketName The name of the storage bucket
 */
export const ensureStorageBucketExists = async (bucketName: string): Promise<void> => {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking storage buckets:', error);
      return;
    }
    
    // If bucket doesn't exist, create it
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 5 // 5MB limit
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBucketExists:', error);
  }
};

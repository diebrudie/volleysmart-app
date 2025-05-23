
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
      // Use service role to create bucket if needed
      // Note: This will only work if the user has admin privileges
      // For regular users, they'll rely on pre-created buckets
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 1024 * 1024 * 5 // 5MB limit
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        console.warn('Bucket creation requires admin privileges. Please make sure the bucket exists on the server.');
      } else {
        console.log(`Bucket ${bucketName} created successfully.`);
      }
    } else {
      console.log(`Bucket ${bucketName} already exists.`);
    }
  } catch (error) {
    console.error('Error in ensureStorageBucketExists:', error);
  }
};

/**
 * Get public URL for a file in storage
 * @param bucketName The storage bucket name
 * @param filePath The path to the file within the bucket
 */
export const getPublicUrl = (bucketName: string, filePath: string): string => {
  return supabase.storage.from(bucketName).getPublicUrl(filePath).data.publicUrl;
};

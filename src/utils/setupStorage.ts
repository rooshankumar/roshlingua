
import { supabase } from '@/lib/supabase';

/**
 * Verifies that required storage buckets exist and creates them if needed
 */
export const verifyStorageBuckets = async () => {
  try {
    // Get a list of existing buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return { success: false, error };
    }
    
    // Required bucket names
    const requiredBuckets = ['avatars', 'attachments', 'public'];
    const existingBucketNames = buckets?.map(bucket => bucket.name) || [];
    
    // Create each missing bucket with public access
    for (const bucketName of requiredBuckets) {
      if (!existingBucketNames.includes(bucketName)) {
        try {
          console.log(`Creating missing bucket: ${bucketName}`);
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
          
          if (createError) {
            console.error(`Error creating bucket ${bucketName}:`, createError);
          } else {
            console.log(`Successfully created bucket: ${bucketName}`);
            
            // Set up public bucket policy
            const { error: policyError } = await supabase.storage.from(bucketName).createPolicy('public-read', {
              name: 'public-read',
              definition: {
                in_allowed: ['*'],
                out_allowed: ['*'],
              },
            });
            
            if (policyError) {
              console.error(`Error setting policy for ${bucketName}:`, policyError);
            }
          }
        } catch (e) {
          console.error(`Exception when creating bucket ${bucketName}:`, e);
        }
      }
    }
    
    return { success: true };
  } catch (err) {
    // Handle network errors gracefully
    console.error('Error in storage bucket verification:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error('Unknown error in storage setup') 
    };
  }
};

/**
 * Updates RLS policies for storage buckets
 */
export const setupStoragePolicies = async () => {
  try {
    const buckets = ['avatars', 'attachments'];
    
    for (const bucket of buckets) {
      // Try to ensure public read access
      try {
        const { error } = await supabase.storage.from(bucket).createPolicy('public-read', {
          name: 'public-read',
          definition: {
            in_allowed: ['*'],
            out_allowed: ['*'],
          },
        });
        
        if (error && !error.message.includes('already exists')) {
          console.error(`Error setting public read policy for ${bucket}:`, error);
        }
      } catch (e) {
        console.warn(`Could not set policy for ${bucket}, may already exist:`, e);
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error setting storage policies:', err);
    return { success: false, error: err };
  }
};

export default verifyStorageBuckets;

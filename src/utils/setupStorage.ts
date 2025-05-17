
import { supabase } from '@/lib/supabase';

/**
 * Verifies that required storage buckets exist and updates their policies if needed
 */
export const verifyStorageBuckets = async () => {
  try {
    console.log('Checking existing storage buckets...');
    
    // Get a list of existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { success: false, error: listError };
    }
    
    // Log existing buckets
    if (existingBuckets && existingBuckets.length > 0) {
      console.log('Found existing buckets:', existingBuckets.map(b => b.name).join(', '));
    } else {
      console.log('No existing buckets found, which is unusual.');
    }
    
    // Skip bucket creation entirely - they should already exist
    // Just update policies on existing buckets instead
    const existingBucketNames = existingBuckets?.map(bucket => bucket.name) || [];
    
    // Update policies for existing buckets
    for (const bucketName of existingBucketNames) {
      try {
        // Ensure buckets are public
        const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
          public: true,
        });
        
        if (updateError) {
          console.error(`Error updating bucket ${bucketName}:`, updateError);
        } else {
          console.log(`✅ Updated permissions for bucket: ${bucketName}`);
          
          // Try to update policies - this might fail due to RLS but that's ok
          try {
            const { error: policyError } = await supabase.storage.from(bucketName).createPolicy('public-read', {
              name: 'public-read',
              definition: {
                in_allowed: ['*'],
                out_allowed: ['*'],
              },
            });
            
            if (policyError && !policyError.message.includes('already exists')) {
              console.error(`Error setting policy for ${bucketName}:`, policyError);
            }
          } catch (policyErr) {
            // Ignore policy errors, these might be restricted by RLS
            console.warn(`Could not set policy for ${bucketName}, may require admin access`);
          }
        }
      } catch (e) {
        console.warn(`Exception when updating bucket ${bucketName}, continuing anyway:`, e);
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

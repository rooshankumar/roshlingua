
import { supabase } from '@/integrations/supabase/client';

export async function verifyStorageBuckets() {
  console.log('Checking Supabase storage buckets...');
  
  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return false;
    }
    
    // Check/create attachments bucket
    await ensureBucket('attachments');
    
    // Check/create avatars bucket
    await ensureBucket('avatars');
    
    return true;
  } catch (err) {
    console.error('Storage verification failed:', err);
    return false;
  }
}

async function ensureBucket(bucketName: string) {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ '${bucketName}' bucket already exists`);
      
      // Make sure bucket is public
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true
      });
      
      if (updateError) {
        console.error(`Failed to update '${bucketName}' bucket settings:`, updateError);
      }
    } else {
      console.log(`'${bucketName}' bucket doesn't exist, creating now...`);
      
      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true, 
        fileSizeLimit: 10485760 // 10MB limit
      });
      
      if (createError) {
        throw createError;
      }
      
      console.log(`✅ Successfully created '${bucketName}' bucket`);
    }
  } catch (error) {
    console.error(`Error setting up '${bucketName}' bucket:`, error);
    throw error;
  }
}

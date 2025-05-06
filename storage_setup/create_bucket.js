
// Script to ensure the 'attachments' bucket exists in your Supabase project
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Checking for storage buckets...');
  
  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${buckets.length} existing buckets`);
    
    // Check if 'attachments' bucket exists
    const attachmentsBucket = buckets.find(b => b.name === 'attachments');
    
    if (attachmentsBucket) {
      console.log("✅ 'attachments' bucket already exists");
      
      // Make sure bucket is public
      const { error: updateError } = await supabase.storage.updateBucket('attachments', {
        public: true
      });
      
      if (updateError) {
        console.error("Failed to update bucket settings:", updateError);
      } else {
        console.log("✅ Ensured 'attachments' bucket is public");
      }
    } else {
      console.log("'attachments' bucket doesn't exist, creating now...");
      
      // Create the bucket
      const { data, error: createError } = await supabase.storage.createBucket('attachments', {
        public: true, // Make it public so files can be accessed without authentication
        fileSizeLimit: 10485760 // 10MB limit
      });
      
      if (createError) {
        throw createError;
      }
      
      console.log("✅ Successfully created 'attachments' bucket");
    }
    
    console.log('\nStorage setup complete!');
    console.log('You can now upload files to the attachments bucket');
    console.log('Files will be available at:');
    console.log(`${supabaseUrl}/storage/v1/object/public/attachments/[filename]`);
    
  } catch (error) {
    console.error('Error setting up storage:', error);
    process.exit(1);
  }
}

main();

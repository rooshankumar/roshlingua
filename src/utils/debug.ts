
import { supabase } from '../lib/supabase';

export async function debugSupabaseSchema() {
  try {
    // Check conversations table schema
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    console.log("Conversations schema test:", { data, error });
    
    // Try specific column query
    const { data: creatorTest, error: creatorError } = await supabase
      .from('conversations')
      .select('creator_id')
      .limit(1);
    
    console.log("Creator ID test:", { creatorTest, creatorError });
    
    return { success: true, data: { data, creatorTest }, error: error || creatorError };
  } catch (err) {
    console.error("Debug error:", err);
    return { success: false, error: err };
  }
}

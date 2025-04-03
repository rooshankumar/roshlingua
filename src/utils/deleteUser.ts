
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required environment variables');
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function deleteUser(userId: string) {
  try {
    // Start a database transaction
    const { error: txError } = await supabase.rpc('begin_transaction');
    if (txError) throw txError;

    try {
      // Delete related records
      const queries = [
        supabase.from('messages').delete().eq('sender_id', userId),
        supabase.from('conversation_participants').delete().eq('user_id', userId),
        supabase.from('profiles').delete().eq('id', userId)
      ];

      // Execute all deletion queries in parallel
      const results = await Promise.all(queries);
      
      // Check for errors
      for (const { error } of results) {
        if (error) throw error;
      }

      // Delete the user from auth.users
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Commit transaction
      await supabase.rpc('commit_transaction');

      // Reload schema
      await supabase.rpc('notify_pgrst_reload');

      console.log('User deleted successfully');
      return { success: true };

    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }

  } catch (error) {
    console.error('Error deleting user:', error.message);
    return { success: false, error };
  }
}

// Example usage
const userId = 'c752a3db-c549-4e01-ac2d-fe6e79f34083';
deleteUser(userId);

export { deleteUser };


import { supabase } from '@/lib/supabase';

export async function debugConversations(conversationId?: string) {
  try {
    console.log("=== SUPABASE DATABASE DEBUGGING ===");
    
    // Check authentication status
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Auth status:", user ? "Authenticated" : "Not authenticated");
    
    // 1. Check table structures
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info');
    
    console.log("Table info status:", tableError ? "Error" : "Success");
    if (tableInfo) {
      console.log("Tables count:", tableInfo.length);
    }
    
    // 2. Check if conversations table has data
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(10);
    
    console.log("Conversations data:", conversations);
    console.log("Conversations error:", convError);
    
    // 3. Check participants
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .limit(10);
    
    console.log("Participants data:", participants);
    console.log("Participants error:", partError);
    
    // 4. Check policies on tables
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('get_policies_info');
    
    console.log("Policies error:", policiesError);
    if (policiesData) {
      console.log("Policies:", policiesData);
    }
    
    // 5. Check messages if conversation ID provided
    if (conversationId) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .limit(20);
      
      console.log("Messages data:", messages);
      console.log("Messages error:", msgError);
    }

    // 6. Check onboarding status from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user?.id)
      .single();
    
    console.log("Profile onboarding status:", profile?.onboarding_completed);
    console.log("Profile error:", profileError);
    
    return { success: true };
  } catch (error) {
    console.error("Debug error:", error);
    return { success: false, error };
  }
}

export async function fixSupabaseData() {
  try {
    // Execute the SQL fix script
    const { error } = await supabase.rpc('execute_fix_script');
    if (error) {
      console.error("Fix script error:", error);
      return { success: false, error };
    }
    
    return { success: true, message: "Database fixed successfully" };
  } catch (error) {
    console.error("Fix error:", error);
    return { success: false, error };
  }
}

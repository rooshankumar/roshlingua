
import { supabase } from '@/lib/supabase';

export async function debugConversations(conversationId?: string) {
  try {
    // Test direct DB access
    console.log("Testing conversation DB access...");
    
    // 1. Check if conversations table has data
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(10);
    
    console.log("Conversations data:", conversations);
    console.log("Conversations error:", convError);
    
    // 2. Check participants
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .limit(10);
    
    console.log("Participants data:", participants);
    console.log("Participants error:", partError);
    
    // 3. Check messages if conversation ID provided
    if (conversationId) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .limit(20);
      
      console.log("Messages data:", messages);
      console.log("Messages error:", msgError);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Debug error:", error);
    return { success: false, error };
  }
}

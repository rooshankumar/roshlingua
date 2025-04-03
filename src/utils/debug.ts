
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
    
    // Test conversation participants query
    const { data: participantTest, error: participantError } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        users:users!conversation_participants_user_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .limit(1);
    
    console.log("Participant relationship test:", { participantTest, participantError });
    
    // Test foreign key relationships
    const { data: fkTest, error: fkError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .limit(1);
      
    console.log("Foreign key test:", { fkTest, fkError });
    
    // Test message-user relationship
    const { data: messageTest, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        sender:users!messages_sender_id_fkey (
          id,
          email
        )
      `)
      .limit(1);
    
    console.log("Message relationship test:", { messageTest, messageError });
    
    return { 
      success: true, 
      data: { data, creatorTest, participantTest, fkTest }, 
      error: error || creatorError || participantError || fkError 
    };
  } catch (err) {
    console.error("Debug error:", err);
    return { success: false, error: err };
  }
}
export async function debugLikes(userId: string) {
  try {
    // Test like count query
    const { data: likeCount, error: likeCountError } = await supabase
      .from('users')
      .select('likes_count')
      .eq('id', userId)
      .single();
    
    console.log("Like count test:", { likeCount, likeCountError });

    // Test likes table query
    const { data: userLikes, error: likesError } = await supabase
      .from('user_likes')
      .select('*')
      .eq('liked_id', userId);
    
    console.log("User likes test:", { userLikes, likesError });

    // Verify no duplicate likes
    const { data: duplicates } = await supabase
      .from('user_likes')
      .select('liker_id, count(*)')
      .eq('liked_id', userId)
      .group('liker_id')
      .having('count(*) > 1');

    if (duplicates && duplicates.length > 0) {
      console.error("Found duplicate likes:", duplicates);
    }

    return { success: true, data: { likeCount, userLikes, duplicates }};
  } catch (error) {
    console.error("Debug likes error:", error);
    return { success: false, error };
  }
}

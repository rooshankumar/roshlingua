
import { supabase } from '@/lib/supabase';

export async function uploadAvatar(file: File, userId: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload new avatar
    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { publicUrl };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

export async function deleteAvatar(userId: string, avatarUrl: string) {
  try {
    // Extract filename from URL
    const fileName = avatarUrl.split('avatars/')[1];
    if (!fileName) throw new Error('Invalid avatar URL');

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([fileName]);

    if (deleteError) throw deleteError;

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    throw error;
  }
}

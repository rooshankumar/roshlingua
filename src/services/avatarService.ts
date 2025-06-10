
import { supabase } from '@/lib/supabase';

export async function uploadAvatar(file: File, userId: string) {
  try {
    console.log('Uploading avatar for user:', userId);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // First, delete any existing avatar files for this user
    try {
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`);
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete);
        console.log('Cleaned up existing avatar files');
      }
    } catch (cleanupError) {
      console.warn('Could not clean up existing files:', cleanupError);
    }

    // Upload new avatar
    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('File uploaded successfully:', data?.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    const publicUrl = urlData?.publicUrl;
    
    if (!publicUrl) {
      throw new Error('Failed to get public URL for uploaded avatar');
    }

    // Add cache-busting parameter to prevent stale images
    const publicUrlWithCache = `${publicUrl}?t=${Date.now()}&v=${Math.random()}`;
    
    console.log('Generated public URL:', publicUrlWithCache);

    return { publicUrl: publicUrlWithCache };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

export async function deleteAvatar(userId: string, avatarUrl: string | null) {
  try {
    if (!avatarUrl) {
      // If no avatar URL exists, just update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;
      return true;
    }

    // Only attempt deletion if it's a Supabase storage URL
    if (avatarUrl.includes('storage.googleapis.com') || avatarUrl.includes('lh3.googleusercontent.com')) {
      // Skip deletion for external URLs (Google avatar)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;
      return true;
    }

    // Extract filename from Supabase storage URL
    const fileName = avatarUrl.includes('avatars/') ? avatarUrl.split('avatars/')[1] : null;
    if (!fileName) {
      // If we can't extract the filename, just update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;
      return true;
    }

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

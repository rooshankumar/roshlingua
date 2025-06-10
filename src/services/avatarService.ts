
import { supabase } from '@/lib/supabase';

export async function uploadAvatar(file: File, userId: string) {
  try {
    console.log('Uploading avatar for user:', userId);
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Ensure we have a valid image file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Determine correct MIME type based on file extension
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      switch (fileExt) {
        case 'png':
          contentType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        default:
          contentType = 'image/png'; // fallback
      }
    }

    console.log('Organizing avatar in user folder:', fileName);
    console.log('Using content type:', contentType);
    console.log('Original file details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // First, delete any existing avatar files for this user's folder
    try {
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`);
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete);
        console.log('Cleaned up existing avatar files for user:', userId);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up existing files:', cleanupError);
    }

    // Convert to ArrayBuffer and upload with explicit headers
    const arrayBuffer = await file.arrayBuffer();

    console.log('Processed file details:', {
      name: fileName.split('/')[1],
      type: contentType,
      size: arrayBuffer.byteLength,
      originalType: file.type
    });

    // Upload new avatar using ArrayBuffer with explicit content type
    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType,
        duplex: 'half'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      console.log('Trying alternative upload method with FormData...');
      
      // Fallback: Try with FormData
      const formData = new FormData();
      const renamedFile = new File([file], fileName.split('/')[1], {
        type: contentType
      });
      formData.append('file', renamedFile);
      
      try {
        const response = await fetch(`${supabase.supabaseUrl}/storage/v1/object/avatars/${fileName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'X-Upsert': 'true'
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('FormData upload failed:', errorText);
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        console.log('FormData upload successful');
      } catch (formDataError) {
        console.error('FormData upload also failed:', formDataError);
        throw uploadError; // Throw original error
      }
    }

    console.log('File uploaded successfully:', data?.path);

    // Verify the uploaded file's metadata
    try {
      const { data: fileInfo, error: infoError } = await supabase.storage
        .from('avatars')
        .list(userId);
      
      if (fileInfo && fileInfo.length > 0) {
        const uploadedFile = fileInfo.find(f => f.name === fileName.split('/')[1]);
        if (uploadedFile) {
          console.log('Uploaded file metadata:', uploadedFile);
        }
      }
    } catch (verifyError) {
      console.warn('Could not verify upload:', verifyError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    const publicUrl = urlData?.publicUrl;
    
    if (!publicUrl) {
      throw new Error('Failed to get public URL for uploaded avatar');
    }

    console.log('Generated public URL:', publicUrl);

    // Update the user's profile with the new avatar URL
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (profileUpdateError) {
      console.warn('Failed to update profile with new avatar URL:', profileUpdateError);
      // Don't throw error as the upload was successful
    } else {
      console.log('Updated profile with new avatar URL');
    }

    // Add cache-busting parameter to prevent stale images
    const publicUrlWithCache = `${publicUrl}?t=${Date.now()}`;
    
    console.log('Returning avatar URL:', publicUrlWithCache);

    return { publicUrl: publicUrlWithCache };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

export async function getUserAvatar(userId: string): Promise<string | null> {
  try {
    console.log('Fetching avatar for user:', userId);

    // List files in the user's folder
    const { data: files, error } = await supabase.storage
      .from('avatars')
      .list(userId, {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing user avatar files:', error);
      return null;
    }

    if (!files || files.length === 0) {
      console.log('No avatar found for user:', userId);
      return null;
    }

    // Get the most recent avatar file
    const avatarFile = files[0];
    const filePath = `${userId}/${avatarFile.name}`;

    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      console.log('Failed to get public URL for avatar');
      return null;
    }

    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    console.log('Retrieved user avatar:', avatarUrl);

    return avatarUrl;
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    return null;
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

import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react'; // Import Loader2

interface ChatAttachmentProps {
  onAttach: (url: string, filename: string) => void;
}

export const ChatAttachment = ({ onAttach }: ChatAttachmentProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select a file to upload.");
      }

      const file = event.target.files[0];
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit.");
      }
      
      // Create a more unique filename with timestamp
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString().substring(2, 8);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${randomStr}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("Uploading file:", fileName, "Size:", (file.size / 1024).toFixed(2) + "KB");

      // Upload with content-type header to ensure proper MIME type
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          contentType: file.type, // Specify the correct MIME type
          cacheControl: '3600' // 1 hour cache
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = await supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
        
      // Append a timestamp to the URL to prevent caching issues
      const publicUrl = `${data.publicUrl}?t=${timestamp}`;
      
      console.log("File uploaded successfully:", publicUrl);
      
      onAttach(publicUrl, file.name);

      // Reset the input after successful upload
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      // You could add toast notification here
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        id="fileUpload"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
      />
      <label htmlFor="fileUpload">
        <Button
          variant="outline"
          size="icon"
          className="h-[45px] w-[45px] rounded-2xl border-muted-foreground/20"
          disabled={uploading}
          type="button"
          onClick={() => document.getElementById('fileUpload')?.click()}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>
      </label>
    </div>
  );
};
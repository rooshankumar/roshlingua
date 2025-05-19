import { useState } from 'react';
import { Paperclip, Image as ImageIcon, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';


interface ChatAttachmentProps {
  onAttach: (url: string, filename: string, thumbnail?: string) => void;
}

export const ChatAttachment = ({ onAttach }: ChatAttachmentProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select a file to upload.");
      }

      const file = event.target.files[0];
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit.");
      }

      setUploading(true);

      // Create a filename with timestamp
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = fileName;

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get file's public URL
      const { data } = await supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      // Add timestamp to URL to avoid caching issues
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      toast({
        title: "File uploaded",
        description: "Your file was uploaded successfully",
        variant: "default"
      });

      // Pass the URL and filename to parent component
      onAttach(publicUrl, file.name);

      // Reset the input after successful upload
      event.target.value = '';
      setUploading(false);

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        id="fileUpload"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".png,.jpg,.jpeg,.gif,.pdf,.mp4,.mp3"
      />

      <label htmlFor="fileUpload">
        <Button
          variant="outline"
          size="icon"
          className="h-[45px] w-[45px] rounded-2xl border-muted-foreground/20"
          disabled={uploading}
          type="button"
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


interface ChatAttachmentProps {
  url: string;
  filename: string;
  className?: string;
}

export const DisplayChatAttachment = ({ url, filename, className }: ChatAttachmentProps) => {
  const isImage = filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  return (
    <div className={cn("border rounded-lg p-2", className)}>
      <p className="text-sm font-medium mb-1">{filename}</p>
      
      {isImage ? (
        <img 
          src={url} 
          alt={filename} 
          className="max-h-48 max-w-full object-contain rounded" 
        />
      ) : (
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <a
            href={url}
            download={filename}
            target="_blank"
            rel="noopener noreferrer" 
            className="text-sm underline"
          >
            Download File
          </a>
        </div>
      )}
    </div>
  );
};
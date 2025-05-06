import { useState, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { generateImageThumbnail } from '@/utils/imageUtils';
import { toast } from '@/components/ui/use-toast';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';


interface ChatAttachmentProps {
  onAttach: (url: string, filename: string, thumbnail?: string) => void;
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

      // Generate a thumbnail if it's an image (for preview)
      let thumbnailDataUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        try {
          thumbnailDataUrl = await generateImageThumbnail(file);
          console.log("Generated thumbnail preview");
        } catch (err) {
          console.warn("Failed to generate thumbnail:", err);
          // Continue without thumbnail
        }
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
          cacheControl: '3600', // 1 hour cache
          upsert: true // Overwrite if exists
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

      // Append a timestamp to the URL to prevent caching issues
      const publicUrl = `${data.publicUrl}?t=${timestamp}`;

      console.log("File uploaded successfully:", publicUrl);

      // Show success message
      toast({
        title: "File uploaded",
        description: "Your file was uploaded successfully",
        variant: "default"
      });

      // Pass the thumbnail along with the URL and filename
      onAttach(publicUrl, file.name, thumbnailDataUrl);

      // Reset the input after successful upload
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
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


interface ChatAttachmentProps {
  url: string;
  filename: string;
  fileType: string;
  fileSize?: number;
  className?: string;
}

export const DisplayChatAttachment = ({ url, filename, fileType, fileSize, className }: ChatAttachmentProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isImage = fileType.startsWith('image/');

  // Auto-load the file if it's an image
  useEffect(() => {
    if (isImage) {
      loadAttachment();
    }

    return () => {
      // Cleanup the object URL when component unmounts
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, isImage]);

  const loadAttachment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const newObjectUrl = URL.createObjectURL(blob);
      setObjectUrl(newObjectUrl);
    } catch (error) {
      console.error('Error loading attachment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Use existing object URL if available, otherwise fetch
      if (!objectUrl) {
        await loadAttachment();
      }

      const a = document.createElement('a');
      a.href = objectUrl || url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn("border rounded-lg p-3 max-w-sm", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="truncate flex-1">
          <p className="font-medium truncate">{filename}</p>
          <p className="text-xs text-muted-foreground">
            {fileType.split('/')[1].toUpperCase()} {fileSize && `· ${(fileSize / 1024).toFixed(1)} KB`}
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={handleDownload} 
          disabled={isDownloading}
          className="ml-2 shrink-0"
        >
          <Download className="h-4 w-4 mr-1" /> 
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </div>

      {isImage && (
        <div className="mt-2 relative">
          {isLoading ? (
            <Skeleton className="w-full h-48 rounded-md" />
          ) : (
            objectUrl && (
              <img 
                src={objectUrl} 
                alt={filename} 
                className="rounded-md w-full max-h-96 object-contain" 
                loading="lazy"
              />
            )
          )}
        </div>
      )}
    </div>
  );
};
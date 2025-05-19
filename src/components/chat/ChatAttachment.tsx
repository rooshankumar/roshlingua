import { useState, useEffect } from 'react';
import { Paperclip, Image as ImageIcon, FileText, Video, FileAudio, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { generateImageThumbnail } from '@/utils/imageUtils';
import { toast } from '@/components/ui/use-toast';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';


interface ChatAttachmentProps {
  onAttach: (url: string, filename: string, thumbnail?: string) => void;
}

export const ChatAttachment = ({ onAttach }: ChatAttachmentProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [showFullPreview, setShowFullPreview] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select a file to upload.");
      }

      const file = event.target.files[0];
      setFileName(file.name);
      setFileType(file.type);

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit.");
      }

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        setPreviewUrl('/icons/video-placeholder.png'); // Use a generic video icon as placeholder
      } else if (file.type.startsWith('audio/')) {
        setPreviewUrl('/icons/audio-placeholder.png'); // Use a generic audio icon as placeholder
      } else if (file.type === 'application/pdf') {
        setPreviewUrl('/icons/pdf-placeholder.png'); // Use a generic PDF icon as placeholder
      } else {
        setPreviewUrl('/icons/file-placeholder.png'); // Generic file icon
      }

      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

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
      // Don't add any slashes - Supabase will handle the path structure
      const filePath = fileName;

      console.log("Uploading file:", fileName, "Size:", (file.size / 1024).toFixed(2) + "KB");

      try {
        // Skip bucket listing - we know attachments bucket exists
        const attachmentsBucket = 'attachments';

        // We know the attachments bucket exists based on your JSON data
        console.log('Using existing attachments bucket');
      } catch (bucketError) {
        console.error("Bucket setup error:", bucketError);
        // Continue with upload attempt anyway
      }

      console.log("Uploading to bucket 'attachments' with path:", filePath);
      console.log("File details:", {
        name: file.name,
        type: file.type,
        size: (file.size / 1024).toFixed(2) + "KB"
      });

      // Upload with content-type header to ensure proper MIME type
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          contentType: file.type, // Specify the correct MIME type
          cacheControl: '3600', // 1 hour cache
          upsert: true // Overwrite if exists
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

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

      console.log("Original public URL:", data.publicUrl);
      
      // Use the improved cleanSupabaseUrl function from imageUtils
      import { cleanSupabaseUrl } from '@/utils/imageUtils';
      const publicUrl = cleanSupabaseUrl(data.publicUrl);
      
      console.log("Cleaned public URL:", publicUrl);

      console.log("File uploaded successfully:", publicUrl);

      // Complete the progress animation
      clearInterval(progressInterval);
      setUploadProgress(100);

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

      // Keep the preview visible briefly so user can see success
      setTimeout(() => {
        setPreviewUrl(null);
        setUploadProgress(0);
        setUploading(false);
      }, 2000);

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);
      setPreviewUrl(null);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      setUploading(false);
    }
  };

  // Get icon based on file type
  const getFileIcon = () => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const cancelUpload = () => {
    setUploading(false);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  return (
    <div className="relative">
      {previewUrl && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={cancelUpload}></div>}
      <input
        type="file"
        id="fileUpload"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
      />

      {previewUrl && (
        <div className="fixed bottom-[80px] left-0 right-0 mx-auto border rounded-lg p-2 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200 w-[95%] max-w-[400px] z-50 bg-background">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium truncate max-w-[250px]">{fileName}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 p-0" 
              onClick={cancelUpload}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {fileType.startsWith('image/') && (
            <div className="flex justify-center">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-full max-h-[150px] object-contain rounded cursor-pointer" 
                onClick={() => setShowFullPreview(true)}
                onError={(e) => {
                  console.error("Preview image failed to load:", e);
                  // Add a data attribute to track retries
                  if (!e.currentTarget.dataset.retried) {
                    // Try without query parameters if they exist
                    if (previewUrl && previewUrl.includes('?')) {
                      const cleanUrl = previewUrl.split('?')[0];
                      e.currentTarget.src = cleanUrl;
                      e.currentTarget.dataset.retried = "true";
                    }
                  } else {
                    // Show a fallback after retry fails
                    e.currentTarget.style.display = 'none';
                    const fallbackEl = document.createElement('div');
                    fallbackEl.className = 'bg-muted/20 p-4 rounded text-center';
                    fallbackEl.innerHTML = '<span>Image preview unavailable</span>';
                    e.currentTarget.parentElement?.appendChild(fallbackEl);
                  }
                }}
              />
            </div>
          )}

          {!fileType.startsWith('image/') && (
            <div className="h-16 flex items-center justify-center rounded">
              {getFileIcon()}
              <span className="ml-2 text-xs">{fileType.split('/')[1].toUpperCase()}</span>
            </div>
          )}

          <div className="mt-3">
            {uploading && (
              <>
                <Progress value={uploadProgress} className="h-2" />
                <span className="text-xs text-muted-foreground mt-2 block text-center">
                  {uploadProgress < 100 ? 'Uploading...' : 'Complete!'}
                </span>
              </>
            )}
            {!uploading && (
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelUpload}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Full preview dialog */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-auto p-0">
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <Button
              onClick={() => setShowFullPreview(false)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-50"
            >
              <X className="h-5 w-5" />
            </Button>
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt={fileName} 
                className="max-w-full max-h-[85vh] object-contain" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
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
      // Add cache-busting parameter to avoid caching issues
      const fetchUrl = url.includes('?') ? url : `${url}?t=${Date.now()}`;
      const response = await fetch(fetchUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const newObjectUrl = URL.createObjectURL(blob);
      setObjectUrl(newObjectUrl);
    } catch (error) {
      console.error('Error loading attachment:', error);
    } finally {
      setIsLoading(false);
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
        <a 
          href={url} 
          download={filename}
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs underline hover:text-primary transition-colors ml-2"
        >
          Download
        </a>
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
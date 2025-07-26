import { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Video, Music, Archive, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatAttachmentProps {
  fileUrl: string;
  fileName: string;
  messageType?: 'image' | 'file' | 'video' | 'audio';
}

export const ChatAttachment: React.FC<ChatAttachmentProps> = ({
  fileUrl,
  fileName,
  messageType
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Get signed URL for the file
  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        if (fileUrl.startsWith('http')) {
          setSignedUrl(fileUrl);
          return;
        }

        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(fileUrl, 3600); // 1 hour expiry

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setSignedUrl(fileUrl); // Fallback to original URL
      }
    };

    getSignedUrl();
  }, [fileUrl]);

  // Get file extension
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // Check if file is an image
  const isImage = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const ext = getFileExtension(filename);
    return imageExtensions.includes(ext) || messageType === 'image';
  };

  // Check if file is a video
  const isVideo = (filename: string) => {
    const videoExtensions = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
    const ext = getFileExtension(filename);
    return videoExtensions.includes(ext) || messageType === 'video';
  };

  // Get file icon
  const getFileIcon = (filename: string) => {
    const ext = getFileExtension(filename);

    if (isImage(filename)) return ImageIcon;
    if (isVideo(filename)) return Video;
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return Music;
    if (['zip', 'rar', '7z', 'tar'].includes(ext)) return Archive;

    return FileText;
  };

  // Handle download
  const handleDownload = async () => {
    try {
      if (!signedUrl) return;

      const response = await fetch(signedUrl);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      }
    }
  };

  // Handle image click to open in modal or new tab
  const handleImageClick = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  if (!signedUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs animate-pulse">
        <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
        <div className="flex-1">
          <div className="h-4 bg-muted-foreground/20 rounded mb-1" />
          <div className="h-3 bg-muted-foreground/20 rounded w-2/3" />
        </div>
      </div>
    );
  }

  // If it's an image, show image preview
  if (isImage(fileName)) {
    return (
      <div className="relative max-w-sm rounded-xl overflow-hidden bg-muted shadow-sm border">
        {!imageLoaded && !imageError && (
          <div className="w-full h-48 bg-muted animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {!imageError && (
          <img
            src={signedUrl}
            alt={fileName}
            className={`w-full h-auto max-h-96 object-cover cursor-pointer transition-all duration-300 hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
            onClick={handleImageClick}
            loading="lazy"
          />
        )}

        {imageError && (
          <div className="w-full h-48 bg-muted flex flex-col items-center justify-center p-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center mb-2">{fileName}</p>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => window.open(signedUrl, '_blank')}
                className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                Open
              </button>
            </div>
          </div>
        )}

        {imageLoaded && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick();
              }}
              className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
              title="Download"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // For videos
  if (isVideo(fileName)) {
    return (
      <div className="max-w-sm rounded-xl overflow-hidden bg-muted shadow-sm border">
        <video
          src={signedUrl}
          controls
          className="w-full h-auto max-h-96"
          preload="metadata"
          poster=""
        >
          Your browser does not support the video tag.
        </video>
        <div className="p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">Video file</p>
          </div>
          <button
            onClick={handleDownload}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // For other files
  const FileIcon = getFileIcon(fileName);

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-xl max-w-xs border shadow-sm hover:shadow-md transition-shadow">
      <div className="p-2 bg-primary/10 rounded-lg">
        <FileIcon className="w-6 h-6 text-primary flex-shrink-0" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {getFileExtension(fileName).toUpperCase()} file
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};
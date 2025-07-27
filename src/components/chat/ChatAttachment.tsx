
import React, { useState } from 'react';
import { Download, FileText, Image, Video, Music, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatAttachmentProps {
  url: string;
  fileName?: string;
  fileType?: string;
  size?: 'sm' | 'md' | 'lg';
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const ChatAttachment: React.FC<ChatAttachmentProps> = ({
  url,
  fileName,
  fileType,
  size = 'md',
  showRemove = false,
  onRemove,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!url) {
    return null;
  }

  // Determine file type from URL or fileName
  const getFileType = () => {
    if (fileType) return fileType;
    
    const extension = fileName?.split('.').pop()?.toLowerCase() || url.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac'];
    
    if (imageExtensions.includes(extension || '')) return 'image';
    if (videoExtensions.includes(extension || '')) return 'video';
    if (audioExtensions.includes(extension || '')) return 'audio';
    return 'file';
  };

  const fileTypeDetected = getFileType();

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new window
      window.open(url, '_blank');
    }
  };

  const sizeClasses = {
    sm: 'max-w-[200px] max-h-[150px]',
    md: 'max-w-[300px] max-h-[200px]',
    lg: 'max-w-[400px] max-h-[300px]'
  };

  const renderIcon = () => {
    switch (fileTypeDetected) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Render image
  if (fileTypeDetected === 'image' && !imageError) {
    return (
      <div className={`relative inline-block ${className}`}>
        {showRemove && onRemove && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 z-10"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        <div className={`rounded-lg overflow-hidden border ${sizeClasses[size]}`}>
          {imageLoading && (
            <div className="flex items-center justify-center bg-muted p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
          <img
            src={url}
            alt={fileName || 'Attachment'}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            onClick={() => window.open(url, '_blank')}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        </div>
      </div>
    );
  }

  // Render video
  if (fileTypeDetected === 'video') {
    return (
      <div className={`relative inline-block ${className}`}>
        {showRemove && onRemove && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 z-10"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        <div className={`rounded-lg overflow-hidden border ${sizeClasses[size]}`}>
          <video
            controls
            className="w-full h-full"
            preload="metadata"
          >
            <source src={url} />
            Your browser does not support video playback.
          </video>
        </div>
      </div>
    );
  }

  // Render audio
  if (fileTypeDetected === 'audio') {
    return (
      <div className={`relative inline-block ${className}`}>
        {showRemove && onRemove && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 z-10"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg border max-w-sm">
          <Music className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {fileName || 'Audio file'}
            </p>
            <audio controls className="w-full mt-2">
              <source src={url} />
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      </div>
    );
  }

  // Render generic file
  return (
    <div className={`relative inline-block ${className}`}>
      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 z-10"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
      <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg border hover:bg-muted/80 transition-colors cursor-pointer max-w-sm">
        <div className="flex-shrink-0">
          {renderIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {fileName || 'File attachment'}
          </p>
          <p className="text-xs text-muted-foreground">
            Click to view
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="flex-shrink-0"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatAttachment;

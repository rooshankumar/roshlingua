import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Video, Music, File, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatAttachmentProps {
  fileUrl: string;
  fileName: string;
  messageType?: 'text' | 'image' | 'file' | 'video' | 'audio';
  className?: string;
}

export const ChatAttachment: React.FC<ChatAttachmentProps> = ({ 
  fileUrl, 
  fileName, 
  messageType = 'file',
  className = '' 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Clean and prepare the file URL
  const cleanFileUrl = (url: string) => {
    if (!url) return '';
    // Remove any double slashes and add cache buster
    let cleanUrl = url.replace(/\/+/g, '/').replace(':/', '://');
    // Add cache buster to prevent caching issues
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${Date.now()}`;
  };

  const processedUrl = cleanFileUrl(fileUrl);

  // Determine file type from extension if messageType is not specific
  const getFileType = () => {
    if (messageType !== 'file') return messageType;

    const extension = fileName?.toLowerCase().split('.').pop() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];

    if (imageExts.includes(extension)) return 'image';
    if (videoExts.includes(extension)) return 'video';
    if (audioExts.includes(extension)) return 'audio';
    return 'file';
  };

  const fileType = getFileType();

  useEffect(() => {
    if (fileType === 'image') {
      setIsLoading(true);
      setImageError(false);

      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setIsLoading(false);
      };
      img.onerror = () => {
        console.error('Failed to load image:', processedUrl);
        setImageError(true);
        setIsLoading(false);
      };
      img.src = processedUrl;
    } else {
      setIsLoading(false);
    }
  }, [processedUrl, fileType]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Image attachment
  if (fileType === 'image') {
    return (
      <div className={`max-w-sm ${className}`}>
        {isLoading && (
          <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}

        {imageError ? (
          <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-red-500">Failed to load image</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              className="shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          imageLoaded && (
            <div className="relative group cursor-pointer">
              <img
                src={processedUrl}
                alt={fileName}
                className="max-w-full h-auto rounded-lg shadow-sm"
                style={{ maxHeight: '300px' }}
                onClick={() => window.open(processedUrl, '_blank')}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(processedUrl, '_blank');
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  // Video attachment
  if (fileType === 'video') {
    return (
      <div className={`max-w-sm ${className}`}>
        <video 
          controls 
          className="w-full rounded-lg shadow-sm"
          style={{ maxHeight: '300px' }}
          preload="metadata"
        >
          <source src={processedUrl} />
          Your browser does not support the video tag.
        </video>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">{fileName}</span>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Audio attachment
  if (fileType === 'audio') {
    return (
      <div className={`max-w-sm ${className}`}>
        <audio controls className="w-full">
          <source src={processedUrl} />
          Your browser does not support the audio tag.
        </audio>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">{fileName}</span>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // File attachment (default)
  return (
    <div className={`bg-muted rounded-lg p-3 flex items-center gap-3 max-w-sm ${className}`}>
      {getFileIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className="text-xs text-muted-foreground">File attachment</p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
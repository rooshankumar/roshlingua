import { useState, useEffect } from 'react';
import { Smile, Check, MessageCircle, Download, FileText, Image as ImageIcon, Video, FileAudio } from 'lucide-react';
import { Message } from '@/types/chat'; // Ensure this path is correct for your project
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Ensure this path is correct
import { MessageReactions } from './MessageReactions'; // Ensure this path is correct
import { formatRelativeTime } from '@/utils/chatUtils'; // Ensure this path is correct
import { Skeleton } from '@/components/ui/skeleton'; // Ensure this path is correct

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isRead?: boolean;
  onReaction?: (emoji: string) => void;
  isLast?: boolean;
  isConsecutive?: boolean;
  replyToMessage?: Message | null; // You had this in the interface but didn't use it in the component
}

export const MessageBubble = ({ message, isCurrentUser, isRead = false, onReaction, isLast = false, isConsecutive = false }: MessageBubbleProps) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(true);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);

  const formattedTime = formatRelativeTime(message.created_at);

  const isImageAttachment = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);
  const isVideoAttachment = message.attachment_url?.match(/\.(mp4|webm|ogg)$/i);
  const isAudioAttachment = message.attachment_url?.match(/\.(mp3|wav|aac)$/i);
  const isPdfAttachment = message.attachment_url?.match(/\.(pdf)$/i);

  // Clean URL function helper
  const cleanAttachmentUrl = (url: string) => {
    if (!url) return '';
    // Fix double slashes in path and add cache buster
    return url.replace('//attachments/', '/attachments/').split('?')[0] + `?t=${Date.now()}`;
  };

  useEffect(() => {
    if (isImageAttachment && message.attachment_url) {
      setIsPreloading(true);
      setImageLoadError(null); // Reset error state
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setIsPreloading(false);
      };
      img.onerror = (error) => {
        console.error('Failed to load image:', error);
        // Try with cleaned URL
        const cleanedUrl = cleanAttachmentUrl(message.attachment_url);
        console.log('Retrying with cleaned URL:', cleanedUrl);

        const retryImg = new Image();
        retryImg.onload = () => {
          setImageLoaded(true);
          setIsPreloading(false);
        };
        retryImg.onerror = () => {
          console.error('Failed to load image even with cleaned URL');
          setImageLoadError("Failed to load image");
          setIsPreloading(false);
        };
        retryImg.src = cleanedUrl;
      };
      img.src = message.attachment_url;
    } else {
      setIsPreloading(false);
      setImageLoadError(null);
    }
  }, [message.attachment_url, isImageAttachment]);

  const toggleReactionPicker = () => {
    setShowReactionPicker(!showReactionPicker);
  };

  const getAttachmentIcon = () => {
    if (isImageAttachment) return <ImageIcon className="h-5 w-5" />;
    if (isVideoAttachment) return <Video className="h-5 w-5" />;
    if (isAudioAttachment) return <FileAudio className="h-5 w-5" />;
    if (isPdfAttachment) return <FileText className="h-5 w-5" />;
    return <Download className="h-5 w-5" />;
  };

  return (
    <div className={`group flex items-end gap-2 mb-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && !isConsecutive && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || "/placeholder.svg"} alt={message.sender?.full_name || "User"} />
          <AvatarFallback>
            {message.sender?.full_name?.charAt(0) || message.sender?.email?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      {!isCurrentUser && isConsecutive && (
        <div className="h-8 w-8 flex-shrink-0"></div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`message-bubble ${isCurrentUser ? 'sent bg-primary text-primary-foreground' : 'received bg-muted text-muted-foreground'} rounded-2xl shadow-sm ${message.attachment_url && (isImageAttachment || isVideoAttachment) ? 'overflow-hidden p-2' : message.attachment_url ? 'p-2' : 'p-1 px-2'} ${isConsecutive ? 'consecutive-message' : ''} inline-block max-w-fit`}
          data-sender={isCurrentUser ? 'self' : 'other'}
        >
          {message.reply_to_id && (
            <div className={`reply-reference ${isCurrentUser ? 'bg-primary-foreground/20' : 'bg-background/50'} p-1.5 mb-1 rounded-lg text-xs border-l-2 ${isCurrentUser ? 'border-primary-foreground/50' : 'border-primary/50'}`}>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span className="font-medium">
                  {message.reply_to?.sender?.full_name || "User"}
                </span>
              </div>
              <div className="truncate max-w-[200px]">
                {message.reply_to?.content || "Original message"}
              </div>
            </div>
          )}
          {/* Image attachment */}
          {isImageAttachment && message.attachment_url && (
            <div className="relative overflow-hidden rounded-lg">
              {isPreloading ? (
                <Skeleton className="w-[280px] h-[200px] rounded-lg" />
              ) : imageLoadError ? (
                <div className="w-[280px] h-[150px] rounded-lg bg-muted/30 flex flex-col items-center justify-center text-muted-foreground p-4 border border-border/50">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-70" />
                  <p className="text-sm font-medium mb-1">{message.attachment_name || "Image"}</p>
                  <p className="text-xs opacity-70 mb-3">Preview unavailable</p>
                  <a
                    href={message.attachment_url}
                    download={message.attachment_name}
                    className="text-xs px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              ) : (
                <div className="relative group">
                  <img
                    src={message.attachment_url}
                    alt={message.attachment_name || "Image attachment"}
                    className="max-w-[280px] max-h-[300px] rounded-lg object-cover cursor-pointer transition-all duration-200 hover:brightness-90"
                    loading="lazy"
                    onLoad={() => {
                      setImageLoaded(true);
                      setIsPreloading(false);
                      setImageLoadError(null);
                    }}
                    onError={() => {
                      setImageLoadError("Failed to load image");
                      setIsPreloading(false);
                    }}
                    onClick={() => {
                      window.open(message.attachment_url, '_blank');
                    }}
                  />
                  {/* Download overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <a
                      href={message.attachment_url}
                      download={message.attachment_name}
                      className="opacity-0 group-hover:opacity-100 bg-black/70 text-white p-2 rounded-full transition-all duration-200 hover:bg-black/90"
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                  {/* Image name overlay */}
                  {message.attachment_name && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                      <p className="text-white text-xs font-medium truncate">
                        {message.attachment_name}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Video attachment */}
          {isVideoAttachment && message.attachment_url && (
            <div className="relative rounded-lg overflow-hidden">
              <video
                src={message.attachment_url}
                controls
                preload="metadata"
                className="max-w-[280px] max-h-[300px] rounded-lg bg-black"
                controlsList="nodownload"
                poster=""
              />
              {message.attachment_name && (
                <div className="absolute bottom-8 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">
                    {message.attachment_name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Audio attachment */}
          {isAudioAttachment && message.attachment_url && (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 max-w-[280px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <FileAudio className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.attachment_name || "Audio file"}
                  </p>
                  <p className="text-xs text-muted-foreground">Audio message</p>
                </div>
                <a
                  href={message.attachment_url}
                  download={message.attachment_name}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              <audio
                src={message.attachment_url}
                controls
                preload="metadata"
                className="w-full h-8"
                style={{ 
                  background: 'transparent',
                  borderRadius: '4px'
                }}
              />
            </div>
          )}

          {/* PDF attachment */}
          {isPdfAttachment && message.attachment_url && (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 max-w-[280px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.attachment_name || "PDF document"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF Document</p>
                </div>
                <a
                  href={message.attachment_url}
                  download={message.attachment_name}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Click to view or download</span>
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                  >
                    Open PDF
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Other file attachment */}
          {message.attachment_url && !isImageAttachment && !isVideoAttachment && !isAudioAttachment && !isPdfAttachment && (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 max-w-[280px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  {getAttachmentIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.attachment_name || "File attachment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {message.attachment_name?.split('.').pop()?.toUpperCase() || "FILE"}
                  </p>
                </div>
                <a
                  href={message.attachment_url}
                  download={message.attachment_name}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <div className={`${message.attachment_url ? 'p-3 pt-2' : ''} whitespace-pre-wrap break-words leading-relaxed`}>
              <span className="inline-flex items-center flex-wrap gap-1">
                {message.content}
              </span>
            </div>
          )}
        </div>

        {/* Time and read receipts */}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/70">
          <span>{formattedTime}</span>
          {isCurrentUser && isRead && <Check className="h-3 w-3" />}
        </div>
      </div>

      {/* Show reactions picker only on long press or right click */}
      {showReactionPicker && (
        <MessageReactions onSelect={(emoji) => {
          if (onReaction) onReaction(emoji);
          setShowReactionPicker(false);
        }} />
      )}
    </div>
  );
};
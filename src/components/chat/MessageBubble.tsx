import { useState, useEffect } from 'react';
import { Check, MessageCircle, Download, Image as ImageIcon, Video } from 'lucide-react';
import { Message } from '@/types/chat';

import { MessageReactions } from './MessageReactions';
import { formatRelativeTime } from '@/utils/chatUtils';
import { Skeleton } from '@/components/ui/skeleton';

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

  const isImageAttachment = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideoAttachment = message.attachment_url?.match(/\.(mp4|webm|mov)$/i);

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



  return (
    <div className={`group flex items-end gap-2 mb-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>

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
            <div className="relative overflow-hidden rounded-lg mb-2">
              {isPreloading ? (
                <Skeleton className="w-[250px] h-[180px] rounded-lg" />
              ) : imageLoadError ? (
                <div className="w-[250px] h-[120px] rounded-lg bg-muted/30 flex flex-col items-center justify-center text-muted-foreground p-4">
                  <ImageIcon className="h-6 w-6 mb-1 opacity-70" />
                  <p className="text-xs font-medium">{message.attachment_name || "Image"}</p>
                  <p className="text-xs opacity-70">Failed to load</p>
                </div>
              ) : (
                <img
                  src={message.attachment_url}
                  alt={message.attachment_name || "Image"}
                  className="max-w-[250px] max-h-[250px] rounded-lg object-cover cursor-pointer"
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
                  onClick={() => window.open(message.attachment_url, '_blank')}
                />
              )}
            </div>
          )}

          {/* Video attachment */}
          {isVideoAttachment && message.attachment_url && (
            <div className="relative rounded-lg overflow-hidden mb-2">
              <video
                src={message.attachment_url}
                controls
                preload="metadata"
                className="max-w-[250px] max-h-[250px] rounded-lg"
              />
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
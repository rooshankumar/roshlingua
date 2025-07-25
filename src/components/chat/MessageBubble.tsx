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
    <div className={`group flex items-end gap-2 mb-2 ${isCurrentUser ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || "/placeholder.svg"} alt={message.sender?.full_name || "User"} />
          <AvatarFallback>
            {message.sender?.full_name?.charAt(0) || message.sender?.email?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}></div_dir>
        <div
          className={`message-bubble ${isCurrentUser ? 'sent bg-primary text-primary-foreground' : 'received bg-muted text-muted-foreground'} rounded-2xl shadow-sm ${message.attachment_url ? 'overflow-hidden' : 'p-1 px-2'} ${isConsecutive ? 'consecutive-message' : ''} inline-block max-w-fit`}
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
          {isImageAttachment && message.attachment_url && (
  <div className="relative">
    {isPreloading ? (
      <Skeleton className="w-[260px] md:w-[300px] h-[200px] rounded-lg" />
    ) : imageLoadError ? (
      <div className="w-[260px] md:w-[300px] h-[200px] rounded-lg bg-muted/20 flex flex-col items-center justify-center text-muted-foreground p-4">
        <FileText className="h-8 w-8 mb-2 opacity-70" />
        <p className="text-sm">{message.attachment_name || "Image"}</p>
        <a
          href={message.attachment_url?.split('?')[0] + `?t=${Date.now()}`}
          download
          className="text-xs mt-2 underline hover:text-primary transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          View/Download
        </a>
      </div>
    ) : (
      <>
        <img
          src={message.attachment_url?.replace('//attachments/', '/attachments/').split('?')[0] + `?t=${Date.now()}`}
          alt={message.attachment_name || "Image attachment"}
          className="max-w-[260px] md:max-w-[300px] max-h-[350px] rounded-lg object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setImageLoaded(true);
            setIsPreloading(false);
            console.log('Image loaded successfully:', message.attachment_url);
          }}
          onError={(e) => {
            console.error('Error loading image:', e);
            const imgEl = e.currentTarget;

            // More aggressive retry strategy
            if (!imgEl.dataset.retried) {
              // First retry: Clean URL of double slashes and query params
              const cleanedUrl = message.attachment_url?.replace('//attachments/', '/attachments/').split('?')[0] + `?t=${Date.now()}`;
              console.log('Retrying with cleaned URL:', cleanedUrl);
              imgEl.src = cleanedUrl;
              imgEl.dataset.retried = 'true';
            } else if (imgEl.dataset.retried === 'true' && !imgEl.dataset.retriedCache) {
              // Second retry: Add cache control headers
              const cacheBusterUrl = message.attachment_url?.split('?')[0] + `?t=${Date.now()}&cache=no-store`;
              console.log('Retrying with cache buster:', cacheBusterUrl);
              imgEl.src = cacheBusterUrl;
              imgEl.dataset.retriedCache = 'true';
            } else if (imgEl.dataset.retriedCache === 'true' && !imgEl.dataset.retriedDirect) {
              // Third retry: Try direct URL with no transformations
              const directUrl = message.attachment_url || '';
              console.log('Retrying with direct URL:', directUrl);
              imgEl.src = directUrl;
              imgEl.dataset.retriedDirect = 'true';
            } else {
              // All retries failed
              setImageLoadError("Failed to load image");
              console.error('All image load attempts failed for:', message.attachment_url);
            }
          }}
          onClick={(e) => {
            if (imageLoaded) {
              e.preventDefault();
              const cleanUrl = message.attachment_url?.replace('//attachments/', '/attachments/').split('?')[0] + `?t=${Date.now()}`;
              const clickEvent = new CustomEvent('image-preview', {
                detail: { url: cleanUrl, name: message.attachment_name }
              });
              document.dispatchEvent(clickEvent);
            }
          }}
        />
        <a
          href={message.attachment_url?.split('?')[0] + `?t=${Date.now()}`}
          download={message.attachment_name}
          className="absolute bottom-2 right-2 bg-black/50 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download className="h-4 w-4" />
        </a>
      </>
    )}
  </div>
)}

          {/* Video attachment */}
          {isVideoAttachment && message.attachment_url && (
            <div className="p-2">
              <video
                src={message.attachment_url}
                controls
                autoPlay={true}
                preload="auto"
                className="max-w-[260px] md:max-w-[300px] rounded-lg"
                controlsList="nodownload"
              />
            </div>
          )}

          {/* Audio attachment */}
          {isAudioAttachment && message.attachment_url && (
            <div className="p-3">
              <p className="text-sm font-medium mb-1">
                {message.attachment_name || "Audio file"}
              </p>
              <audio
                src={message.attachment_url}
                controls
                autoPlay
                preload="auto"
                className="w-full max-w-[260px]"
              />
            </div>
          )}

          {/* PDF attachment */}
          {isPdfAttachment && message.attachment_url && (
            <div className="p-3">
              <p className="text-sm font-medium mb-2">
                {message.attachment_name || "PDF document"}
              </p>
              <iframe
                src={message.attachment_url}
                className="w-[260px] h-[200px] md:w-[300px] md:h-[250px] rounded-lg border border-border"
              />
              <a
                href={message.attachment_url}
                download
                className="text-xs mt-1 underline hover:text-primary transition-colors block text-center"
              >
                Download PDF
              </a>
            </div>
          )}

          {/* Other file attachment */}
          {message.attachment_url && !isImageAttachment && !isVideoAttachment && !isAudioAttachment && !isPdfAttachment && (
            <div className="flex items-center gap-2 p-3">
              <div className="bg-background/20 p-2 rounded-full">
                {getAttachmentIcon()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {message.attachment_name || "Attachment"}
                </p>
                <a
                  href={message.attachment_url}
                  download
                  className="text-xs underline hover:text-primary transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <div className={message.attachment_url ? 'p-3 pt-2' : ''}>
              {message.content}
            </div>
          )}
        </div>

        {/* Time and read receipts */}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/70">
          <span>{formattedTime}</span>
          {isCurrentUser && isRead && <Check className="h-3 w-3" />}
        </div>
      </div>

      {/* Reactions */}
      <div className="message-actions flex items-center">
        <button
          onClick={toggleReactionPicker}
          className="text-muted-foreground/70 hover:text-muted-foreground p-1 rounded-full"
          aria-label="React to message"
        >
          <span className="text-lg">😊</span>
        </button>
      </div>

      {showReactionPicker && (
        <MessageReactions onSelect={(emoji) => {
          if (onReaction) onReaction(emoji);
          setShowReactionPicker(false);
        }} />
      )}
    </div>
  );
};
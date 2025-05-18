import { useState, useEffect } from 'react';
import { Smile, Check, MessageCircle, Download, FileText, Image as ImageIcon, Video, FileAudio } from 'lucide-react';
import { Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageReactions } from './MessageReactions';
import { formatRelativeTime } from '@/utils/chatUtils';
import { handleImageLoadError, preloadImage } from '@/utils/imageUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isRead?: boolean;
  onReaction?: (emoji: string) => void;
  isLast?: boolean;
  isConsecutive?: boolean;
  replyToMessage?: Message | null;
}

export const MessageBubble = ({ message, isCurrentUser, isRead = false, onReaction, isLast = false, isConsecutive = false }: MessageBubbleProps) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(true);

  // Format time from ISO string to relative time (e.g. "2 hours ago")
  const formattedTime = formatRelativeTime(message.created_at);

  // Check attachment type
  const isImageAttachment = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);
  const isVideoAttachment = message.attachment_url?.match(/\.(mp4|webm|ogg)$/i);
  const isAudioAttachment = message.attachment_url?.match(/\.(mp3|wav|aac)$/i);
  const isPdfAttachment = message.attachment_url?.match(/\.(pdf)$/i);

  // Preload images immediately on component mount
  useEffect(() => {
    if (isImageAttachment && message.attachment_url) {
      setIsPreloading(true);
      preloadImage(message.attachment_url)
        .then(() => {
          setImageLoaded(true);
          setIsPreloading(false);
        })
        .catch(error => {
          console.error('Failed to preload image:', error);
          setIsPreloading(false);
        });
    } else {
      setIsPreloading(false);
    }
  }, [message.attachment_url, isImageAttachment]);

  const toggleReactionPicker = () => {
    setShowReactionPicker(!showReactionPicker);
  };

  // Function to get attachment icon based on file type
  const getAttachmentIcon = () => {
    if (isImageAttachment) return <ImageIcon className="h-5 w-5" />;
    if (isVideoAttachment) return <Video className="h-5 w-5" />;
    if (isAudioAttachment) return <FileAudio className="h-5 w-5" />;
    if (isPdfAttachment) return <FileText className="h-5 w-5" />;
    return <Download className="h-5 w-5" />;
  };

  return (
    <div className={`group flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <Avatar className="h-10 w-10">
          <AvatarImage src={message.sender?.avatar_url || "/placeholder.svg"} alt={message.sender?.full_name || "User"} />
          <AvatarFallback>
            {message.sender?.full_name?.charAt(0) || message.sender?.email?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`message-bubble ${isCurrentUser ? 'sent bg-primary text-primary-foreground' : 'received bg-muted text-muted-foreground'} rounded-2xl shadow-sm ${message.attachment_url ? 'overflow-hidden' : 'p-1 px-2'} ${isConsecutive ? 'consecutive-message' : ''} inline-block max-w-fit`}
          data-sender={isCurrentUser ? 'self' : 'other'}
        >
          {/* Reply reference UI */}
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
          {isImageAttachment && (
            <div className="relative">
              {isPreloading ? (
                <Skeleton className="w-[260px] md:w-[300px] h-[200px] rounded-lg" />
              ) : (
                <>
                  <img
                    src={message.attachment_url && message.attachment_url.includes('?') ? 
                      message.attachment_url : 
                      `${message.attachment_url}?t=${Date.now()}&cache=no-store`}
                    alt={message.attachment_name || "Image attachment"}
                    className="max-w-[260px] md:max-w-[300px] max-h-[350px] rounded-lg object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                    loading="eager"
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => handleImageLoadError(e, message.attachment_url, "Image failed to load")}
                    onClick={(e) => {
                      e.preventDefault();
                      // Set the target of the click event to be handled by parent component
                      const clickEvent = new CustomEvent('image-preview', { 
                        detail: { url: message.attachment_url, name: message.attachment_name } 
                      });
                      document.dispatchEvent(clickEvent);
                    }}
                  />
                  <a 
                    href={message.attachment_url}
                    download
                    className="absolute bottom-2 right-2 bg-black/50 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </>
              )}
            </div>
          )}

          {/* Video attachment */}
          {isVideoAttachment && (
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
          {isAudioAttachment && (
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
          {isPdfAttachment && (
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

      {/* Reactions - Using emoji button similar to the reference */}
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
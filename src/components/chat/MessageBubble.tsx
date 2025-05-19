import { useState, useEffect } from 'react';
import { Smile, Check, MessageCircle, Download, FileText, Image as ImageIcon, Video, FileAudio } from 'lucide-react';
import { Message } from '@/types/chat'; // Ensure this path is correct for your project
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Ensure this path is correct
import { MessageReactions } from './MessageReactions'; // Ensure this path is correct
import { formatRelativeTime } from '@/utils/chatUtils'; // Ensure this path is correct
import { Skeleton } from '@/components/ui/skeleton'; // Ensure this path is correct
import { cleanSupabaseUrl } from '@/utils/imageUtils';

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
        setImageLoadError("Failed to load image");
        setIsPreloading(false);
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
          {/* Display attachment */}
          {message.attachment_url && (
            <div className="p-2">
              {message.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div>
                  <p className="text-xs mb-1">{message.attachment_name || "Image"}</p>
                  <img
                    src={message.attachment_url}
                    alt={message.attachment_name || "Image"}
                    className="max-w-[240px] max-h-[180px] object-contain rounded"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="text-sm truncate">{message.attachment_name || "File"}</p>
                    <a
                      href={message.attachment_url}
                      download
                      className="text-xs underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
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
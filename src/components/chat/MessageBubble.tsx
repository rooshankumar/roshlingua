import { useState } from 'react';
import { Smile, Check, MessageCircle, Download } from 'lucide-react';
import { Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageReactions } from './MessageReactions';
import { formatRelativeTime } from '@/utils/chatUtils';
import { handleImageLoadError } from '@/utils/imageUtils';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isRead?: boolean;
  onReaction?: (emoji: string) => void;
  isLast?: boolean;
}

export const MessageBubble = ({ message, isCurrentUser, isRead = false, onReaction, isLast = false }: MessageBubbleProps) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const toggleReactionPicker = () => {
    setShowReactionPicker(!showReactionPicker);
  };

  // Format time from ISO string to relative time (e.g. "2 hours ago")
  const formattedTime = formatRelativeTime(message.created_at);

  // Check if the attachment is an image
  const isImageAttachment = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className={`group flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender?.avatar_url || "/placeholder.svg"} alt={message.sender?.full_name || "User"} />
          <AvatarFallback>
            {message.sender?.full_name?.charAt(0) || message.sender?.email?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`message-bubble ${isCurrentUser ? 'sent bg-primary text-primary-foreground' : 'received bg-muted text-muted-foreground'} p-3 rounded-2xl shadow-sm ${message.attachment_url ? 'p-0 overflow-hidden' : 'p-3'}`}
        >
          {/* Image attachment */}
          {isImageAttachment && (
            <div className="relative">
              <img 
                src={message.attachment_url}
                alt={message.attachment_name || "Image attachment"}
                className={`max-w-[260px] md:max-w-[300px] rounded-lg cursor-pointer ${!imageLoaded ? 'min-h-[100px] bg-muted animate-pulse' : ''}`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => handleImageLoadError(e, "Image failed to load")}
                onClick={() => window.open(message.attachment_url, '_blank')}
              />
              <a 
                href={message.attachment_url}
                download={message.attachment_name || "download"}
                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Non-image attachment (files, etc.) */}
          {message.attachment_url && !isImageAttachment && (
            <div className="flex items-center gap-2 p-3">
              <div className="bg-background/20 p-2 rounded-full">
                <Download className="h-5 w-5" />
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
          className="text-muted-foreground/50 hover:text-muted-foreground p-1 rounded-full"
        >
          <Smile className="h-4 w-4" />
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
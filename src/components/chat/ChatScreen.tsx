
import { Message, User } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatLastSeen, formatMessageDate, getMessagesByConversation, groupMessagesByDate } from "@/utils/chatUtils";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { TypingIndicator } from "./TypingIndicator";

interface ChatScreenProps {
  conversationId: string;
  recipient: User;
  currentUserId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBack?: () => void;
}

export const ChatScreen = ({
  conversationId,
  recipient,
  currentUserId,
  messages,
  onSendMessage,
  onBack,
}: ChatScreenProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const isMobile = useMobile();
  
  const conversationMessages = getMessagesByConversation(messages, conversationId);
  const groupedMessages = groupMessagesByDate(conversationMessages);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (conversationMessages.length > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage.sender_id === currentUserId) {
        const timer = setTimeout(() => {
          setIsTyping(true);
          const typingDuration = Math.random() * 3000 + 1000;
          setTimeout(() => {
            setIsTyping(false);
          }, typingDuration);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, conversationId, currentUserId, conversationMessages]);
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar>
          <AvatarImage src={recipient.avatar} alt={recipient.name} />
          <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-medium">{recipient.name}</h3>
          <p className="text-xs text-muted-foreground">
            {recipient.isOnline ? "Online" : formatLastSeen(recipient.lastSeen)}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {groupedMessages.map(([date, messages]) => (
          <div key={date} className="space-y-4">
            <div className="flex justify-center">
              <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                {formatMessageDate(messages[0].created_at)}
              </span>
            </div>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender_id === currentUserId}
              />
            ))}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start gap-2 max-w-[80%]">
            <Avatar className="h-8 w-8">
              <AvatarImage src={recipient.avatar} alt={recipient.name} />
              <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
            </Avatar>
            <TypingIndicator />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
};

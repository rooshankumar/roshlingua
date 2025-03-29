import { useEffect, useRef } from "react";
import { Message, User } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Loader2 } from "lucide-react";

interface ChatScreenProps {
  messages: Message[];
  partner: User;
  isLoading?: boolean;
  onSendMessage: (content: string) => void;
  learningLanguage: string;
  nativeLanguage: string;
}

export const ChatScreen = ({
  messages,
  partner,
  isLoading,
  onSendMessage,
  learningLanguage,
  nativeLanguage
}: ChatScreenProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader partner={partner} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.sender_id === partner.id}
            learningLanguage={learningLanguage}
            nativeLanguage={nativeLanguage}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        onSendMessage={onSendMessage}
        learningLanguage={learningLanguage}
      />
    </div>
  );
};
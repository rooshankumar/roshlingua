
import { Conversation } from "@/types/chat";
import { ConversationItem } from "./ConversationItem";
import { Skeleton } from "../ui/skeleton";

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  isLoading?: boolean;
}

export const ConversationList = ({
  conversations,
  currentUserId,
  activeConversationId,
  onSelectConversation,
  isLoading,
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          currentUserId={currentUserId}
          isActive={conversation.id === activeConversationId}
          onClick={() => onSelectConversation(conversation.id)}
        />
      ))}
    </div>
  );
};

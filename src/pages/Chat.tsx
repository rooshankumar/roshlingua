
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  ChevronDown, 
  Heart, 
  Loader2, 
  MoreHorizontal, 
  Paperclip, 
  Send, 
  Smile, 
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  senderId: number;
  timestamp: Date;
  status: "sent" | "delivered" | "read";
  reaction?: string;
}

interface Conversation {
  id: number;
  user: {
    id: number;
    name: string;
    avatar: string;
    online: boolean;
    lastActive: string;
  };
  messages: Message[];
}

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Fetch conversation data
  useEffect(() => {
    // In a real app, this would fetch from an API
    setTimeout(() => {
      const mockConversation: Conversation = {
        id: 1,
        user: {
          id: parseInt(id || "1"),
          name: "Sarah Johnson",
          avatar: "/placeholder.svg",
          online: true,
          lastActive: "2 min ago",
        },
        messages: [
          {
            id: "1",
            content: "Hi there! I saw that you're learning Spanish. I'm a native speaker and would love to help.",
            senderId: parseInt(id || "1"),
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            status: "read",
          },
          {
            id: "2",
            content: "That would be amazing! I've been struggling with verb conjugations. Could you help me practice?",
            senderId: 0, // Current user
            timestamp: new Date(Date.now() - 82800000), // 23 hours ago
            status: "read",
          },
          {
            id: "3",
            content: "Absolutely! Let's start with present tense. What specific verbs are you having trouble with?",
            senderId: parseInt(id || "1"),
            timestamp: new Date(Date.now() - 79200000), // 22 hours ago
            status: "read",
          },
          {
            id: "4",
            content: "I struggle with irregular verbs like 'tener' and 'hacer'. I always mix up the conjugations.",
            senderId: 0,
            timestamp: new Date(Date.now() - 75600000), // 21 hours ago
            status: "read",
          },
          {
            id: "5",
            content: "No worries, those can be tricky! Let's practice. 'Tener' (to have): yo tengo, tú tienes, él/ella tiene, nosotros tenemos, vosotros tenéis, ellos tienen.",
            senderId: parseInt(id || "1"),
            timestamp: new Date(Date.now() - 72000000), // 20 hours ago
            status: "read",
            reaction: "❤️",
          },
          {
            id: "6",
            content: "And 'hacer' (to do/make): yo hago, tú haces, él/ella hace, nosotros hacemos, vosotros hacéis, ellos hacen.",
            senderId: parseInt(id || "1"),
            timestamp: new Date(Date.now() - 71900000), // Still 20 hours ago, but a minute later
            status: "read",
          },
          {
            id: "7",
            content: "That's really helpful! Can you give me some example sentences using these verbs?",
            senderId: 0,
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            status: "read",
          },
          {
            id: "8",
            content: "Sure! Here are some examples:\n- Yo tengo un libro (I have a book)\n- Tú haces la tarea (You do the homework)\n- Ella tiene tres hermanos (She has three brothers)\n- Nosotros hacemos un viaje (We make a trip)",
            senderId: parseInt(id || "1"),
            timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
            status: "read",
          },
        ],
      };
      
      setConversation(mockConversation);
      setLoading(false);
    }, 1000);
  }, [id]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);
  
  // Handle typing indicator
  useEffect(() => {
    if (!conversation) return;
    
    // Simulate other user typing
    const timer = setTimeout(() => {
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [conversation]);
  
  const handleSendMessage = () => {
    if (!message.trim() || !conversation) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      senderId: 0, // Current user
      timestamp: new Date(),
      status: "sent",
    };
    
    setConversation({
      ...conversation,
      messages: [...conversation.messages, newMessage],
    });
    
    setMessage("");
    
    // Simulate message status changes
    setTimeout(() => {
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((msg) => 
            msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg
          ),
        };
      });
      
      setTimeout(() => {
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((msg) => 
              msg.id === newMessage.id ? { ...msg, status: "read" } : msg
            ),
          };
        });
        
        // Simulate reply from other user
        setTimeout(() => {
          setIsTyping(true);
          
          setTimeout(() => {
            setIsTyping(false);
            
            const replies = [
              "That makes sense! Do you have any other questions about Spanish?",
              "Would you like to practice some more verb conjugations?",
              "How about we try some conversation practice next time?",
              "I think you're making great progress! Keep it up!",
            ];
            
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            
            setConversation((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: [
                  ...prev.messages, 
                  {
                    id: Date.now().toString(),
                    content: randomReply,
                    senderId: parseInt(id || "1"),
                    timestamp: new Date(),
                    status: "sent",
                  }
                ],
              };
            });
          }, 3000);
        }, 3000);
      }, 1000);
    }, 1000);
  };
  
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today: show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return "Yesterday";
    } else if (diffDays < 7) {
      // Within a week: show day name
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      // Older: show date
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };
  
  const handleReaction = (messageId: string) => {
    if (!conversation) return;
    
    setConversation({
      ...conversation,
      messages: conversation.messages.map((msg) => 
        msg.id === messageId 
          ? { ...msg, reaction: msg.reaction ? undefined : "❤️" } 
          : msg
      ),
    });
  };
  
  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spinner"></div>
          <p className="mt-4 text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }
  
  if (!conversation) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Conversation not found</h2>
        <p className="text-muted-foreground mb-6">
          The conversation you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link to="/community">Browse Community</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container h-full max-h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/chat/inbox">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <Link to={`/profile/${conversation.user.id}`} className="flex items-center space-x-3">
            <div className="relative">
              <Avatar>
                <AvatarImage src={conversation.user.avatar} alt={conversation.user.name} />
                <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {conversation.user.online && (
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"></span>
              )}
            </div>
            <div>
              <h2 className="font-medium">{conversation.user.name}</h2>
              <p className="text-xs text-muted-foreground">
                {conversation.user.online ? "Online" : `Last active ${conversation.user.lastActive}`}
              </p>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/profile/${conversation.user.id}`}>
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Clear chat history</DropdownMenuItem>
              <DropdownMenuItem>Block user</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.map((message, index) => {
          const isCurrentUser = message.senderId === 0;
          const showDate = index === 0 || 
            new Date(message.timestamp).toDateString() !== 
            new Date(conversation.messages[index - 1].timestamp).toDateString();
          
          return (
            <div key={message.id} className="space-y-4">
              {showDate && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    {new Date(message.timestamp).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Badge>
                </div>
              )}
              
              <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] relative group ${isCurrentUser ? "mr-2" : "ml-2"}`}>
                  {!isCurrentUser && (
                    <div className="absolute -left-11 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conversation.user.avatar} alt={conversation.user.name} />
                        <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  <div className={`
                    p-3 rounded-lg ${isCurrentUser 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                    } 
                    ${isCurrentUser ? "rounded-br-sm" : "rounded-bl-sm"}
                  `}>
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                  
                  {message.reaction && (
                    <div className="absolute -bottom-2 right-0 bg-muted rounded-full p-0.5 text-xs">
                      {message.reaction}
                    </div>
                  )}
                  
                  <div className={`flex items-center mt-1 text-xs text-muted-foreground ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                    <span>{formatTimestamp(new Date(message.timestamp))}</span>
                    
                    {isCurrentUser && (
                      <span className="ml-2">
                        {message.status === "sent" && "Sent"}
                        {message.status === "delivered" && "Delivered"}
                        {message.status === "read" && "Read"}
                      </span>
                    )}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`absolute opacity-0 group-hover:opacity-100 transition-opacity ${
                      isCurrentUser ? "-left-10 top-0" : "-right-10 top-0"
                    }`}
                    onClick={() => handleReaction(message.id)}
                  >
                    <Heart className={`h-4 w-4 ${message.reaction ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-lg rounded-bl-sm max-w-[70%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef}></div>
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="pr-10"
            />
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSendMessage} 
            size="icon"
            disabled={!message.trim()}
            className="button-hover"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

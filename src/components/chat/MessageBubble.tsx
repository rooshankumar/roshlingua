
import { useState } from "react";
import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Translate, VolumeIcon, BookMark, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  learningLanguage: string;
  nativeLanguage: string;
}

export const MessageBubble = ({ 
  message, 
  isOwnMessage,
  learningLanguage,
  nativeLanguage
}: MessageBubbleProps) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [translation, setTranslation] = useState("");

  const handleTranslate = async () => {
    if (!showTranslation) {
      // Mock translation - replace with actual translation API
      setTranslation("This is a translated version of the message");
    }
    setShowTranslation(!showTranslation);
  };

  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = learningLanguage.toLowerCase().includes('english') ? 'en-US' : 'es-ES';
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // Add to saved phrases in your backend
  };

  return (
    <div 
      className={`flex flex-col gap-1 max-w-[80%] ${isOwnMessage ? "ml-auto items-end" : ""}`}
    >
      <div
        className={`p-3 rounded-lg ${
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <p>{message.content}</p>
        {showTranslation && (
          <div className="mt-2 pt-2 border-t border-primary/20 text-sm opacity-80">
            {translation}
          </div>
        )}
      </div>
      
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={handleTranslate}
            >
              <Translate className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showTranslation ? "Hide translation" : "Show translation"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleSpeak}
            >
              <VolumeIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Listen to pronunciation</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleSave}
            >
              {isSaved ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <BookMark className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSaved ? "Saved to phrases" : "Save phrase"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

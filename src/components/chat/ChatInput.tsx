
import { useState, useRef, KeyboardEvent } from "react";
import { Send, Languages, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  learningLanguage: string;
}

export const ChatInput = ({ onSendMessage, learningLanguage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      setSuggestions([]);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const checkGrammar = async () => {
    setIsChecking(true);
    // Mock grammar check - replace with actual API call
    setTimeout(() => {
      setSuggestions(["Consider using 'would like' instead of 'want'"]);
      setIsChecking(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-t">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={`Type your message in ${learningLanguage}...`}
          className="min-h-[60px] max-h-[120px]"
          rows={1}
        />
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-[60px]"
                onClick={checkGrammar}
                disabled={!message.trim() || isChecking}
              >
                <Languages className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="space-y-2">
                <h4 className="font-medium">Writing Suggestions</h4>
                {suggestions.map((suggestion, i) => (
                  <div key={i} className="text-sm flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500" />
                    <p>{suggestion}</p>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            onClick={handleSend}
            className="h-[60px] px-6"
            disabled={!message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};


import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';

interface ChatSearchProps {
  messages: Message[];
  onSearchResult: (messageId: string) => void;
}

export const ChatSearch = ({ messages, onSearchResult }: ChatSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Message[]>([]);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      const filteredMessages = messages.filter(message => 
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filteredMessages);
    } else {
      setResults([]);
    }
  }, [searchTerm, messages]);

  return (
    <div className="relative">
      {!isOpen ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-9 w-9"
        >
          <Search className="h-5 w-5" />
        </Button>
      ) : (
        <div className="absolute right-0 top-0 flex items-center bg-background p-1 rounded-lg border border-border shadow-md z-50 w-[300px]">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="h-9"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
              setResults([]);
            }}
            className="h-8 w-8 ml-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {results.length > 0 && isOpen && (
        <div className="absolute right-0 top-12 bg-background rounded-lg border border-border shadow-md p-2 w-[300px] max-h-[300px] overflow-y-auto z-50">
          {results.map(message => (
            <div 
              key={message.id}
              className="p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
              onClick={() => {
                onSearchResult(message.id);
                setIsOpen(false);
                setSearchTerm('');
                setResults([]);
              }}
            >
              <p className="text-sm font-medium">{message.sender?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{message.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

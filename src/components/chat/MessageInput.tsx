import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, Smile, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from './VoiceRecorder';
import { useAuth } from '@/hooks/useAuth';

interface MessageInputProps {
  onSend: (content: string, messageType?: 'text' | 'image' | 'file' | 'audio', fileUrl?: string, fileName?: string) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  receiverId?: string;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStartTyping,
  onStopTyping,
  receiverId,
  disabled = false
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentMessage = useRef<string>('');
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea with better mobile handling
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      // Store scroll position to prevent jumping
      //const container = textareaRef.current.closest('.chat-content-area');
      //const scrollTop = container?.scrollTop || 0;

      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = window.innerWidth < 768 ? 100 : 120; // Smaller max height on mobile

      if (scrollHeight <= maxHeight) {
        textareaRef.current.style.height = `${scrollHeight}px`;
      } else {
        textareaRef.current.style.height = `${maxHeight}px`;
      }

      // Restore scroll position
      //if (container) {
      //container.scrollTop = scrollTop;
      //}
    }
  }, []);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (typeof onStartTyping === 'function') {
      onStartTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (typeof onStopTyping === 'function') {
        onStopTyping();
      }
    }, 3000);
  }, [onStartTyping, onStopTyping]);

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typeof onStopTyping === 'function') {
      onStopTyping();
    }
  }, [onStopTyping]);

  // Handle message change
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    adjustTextareaHeight();

    // Handle typing indicators
    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  }, [adjustTextareaHeight, handleTypingStart, handleTypingStop]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || !user || !receiverId || isSending) return;

    // Prevent duplicate messages
    if (trimmedMessage === lastSentMessage.current) return;

    // Clear any pending send timeout
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }

    setIsSending(true);
    lastSentMessage.current = trimmedMessage;

    try {
      await onSend(trimmedMessage);
      setMessage('');
      handleTypingStop();

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Reset duplicate check after successful send
      setTimeout(() => {
        lastSentMessage.current = '';
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, disabled, user, receiverId, onSend, handleTypingStop, isSending]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    setIsUploading(true);
    try {
      // Handle file upload logic here
      // For now, just send the file name as text
      await onSend(`📎 ${file.name}`, 'file');
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [disabled, onSend]);

  // Handle voice recording
  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    if (disabled) return;

    try {
      // Handle voice message upload logic here
      await onSend(`🎤 Voice message (${Math.round(duration)}s)`, 'audio');
    } catch (error) {
      console.error('Error sending voice message:', error);
    } finally {
      setIsRecording(false);
    }
  }, [disabled, onSend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  if (!user || !receiverId) {
    return null;
  }

  return (
    <div className="flex items-end gap-2 p-4 bg-background border-t">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        disabled={disabled || isUploading}
      />

      {/* Attachment button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
      >
        <Paperclip className="w-4 h-4" />
      </Button>

      {/* Message input */}
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[120px] resize-none pr-12"
          disabled={disabled}
          rows={1}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
          }}
        />
      </div>

      {/* Voice recording or send button */}
      {isRecording ? (
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={() => setIsRecording(false)}
        />
      ) : message.trim() ? (
        <Button
          type="button"
          onClick={handleSend}
          disabled={disabled || isUploading || isSending}
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setIsRecording(true)}
          disabled={disabled}
        >
          <Mic className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default MessageInput;
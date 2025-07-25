
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Mic, MicOff } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { useAuth } from '@/hooks/useAuth';

interface MessageInputProps {
  onSend: (content: string, messageType?: 'text' | 'image' | 'file' | 'audio', fileUrl?: string, fileName?: string) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
    if (!trimmedMessage || disabled || !user || !receiverId) return;

    try {
      await onSend(trimmedMessage);
      setMessage('');
      handleTypingStop();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [message, disabled, user, receiverId, onSend, handleTypingStop]);

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
          disabled={disabled || isUploading}
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
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

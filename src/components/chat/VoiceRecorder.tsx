
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface VoiceRecorderProps {
  onComplete: (url: string) => void;
}

export const VoiceRecorder = ({ onComplete }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  const cancelRecording = () => {
    stopRecording();
    setAudioURL(null);
    setRecordingTime(0);
  };
  
  const uploadVoiceMessage = async () => {
    if (!audioURL) return;
    
    setIsUploading(true);
    
    try {
      // Convert the audioURL to a File object
      const response = await fetch(audioURL);
      const blob = await response.blob();
      const fileName = `voice-${Date.now()}.webm`;
      const file = new File([blob], fileName, { type: 'audio/webm' });
      
      // Upload to Supabase storage
      const filePath = `${crypto.randomUUID()}-${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('voice_messages')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data } = await supabase.storage
        .from('voice_messages')
        .getPublicUrl(filePath);
        
      if (data && data.publicUrl) {
        onComplete(data.publicUrl);
        cancelRecording();
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (error) {
      console.error('Error uploading voice message:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  return (
    <div className="flex items-center gap-2">
      {!isRecording && !audioURL ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50"
          onClick={startRecording}
        >
          <Mic className="h-5 w-5" />
        </Button>
      ) : isRecording ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 bg-destructive/10 rounded-full px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      ) : audioURL ? (
        <div className="flex items-center gap-2">
          <audio src={audioURL} controls className="h-10 max-w-[200px]" />
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
            onClick={uploadVoiceMessage}
            disabled={isUploading}
          >
            <Send className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={cancelRecording}
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
};

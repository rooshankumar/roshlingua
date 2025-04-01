
import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/button';

interface ChatAttachmentProps {
  onAttach: (url: string, filename: string) => void;
}

export const ChatAttachment = ({ onAttach }: ChatAttachmentProps) => {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select a file to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = await supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      onAttach(data.publicUrl, file.name);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        onChange={uploadFile}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={uploading}
      />
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="icon"
          className="h-[60px] relative"
          disabled={uploading}
        >
          <input
            type="file"
            accept="image/*"
            onChange={uploadFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <Image className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          className="h-[60px] relative"
          disabled={uploading}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={uploadFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <FileText className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          className="h-[60px] relative"
          disabled={uploading}
        >
          <input
            type="file"
            onChange={uploadFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <File className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

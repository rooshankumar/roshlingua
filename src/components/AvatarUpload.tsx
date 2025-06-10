import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { uploadAvatar as uploadAvatarService } from "@/services/avatarService";

interface AvatarUploadProps {
  url: string | null;
  onUpload: (url: string) => void;
  userId: string;
}

export function AvatarUpload({ url, onUpload, userId }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error("Please select an image file.");
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB.");
      }

      const result = await uploadAvatarService(file, userId);

      onUpload(result.publicUrl);

      // Force a refresh of the profile data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      toast({
        title: "Success",
        description: "Avatar updated successfully! The page will refresh to show your new avatar.",
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Error uploading avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        id="avatar"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        className="hidden"
      />
      <Button 
        variant="outline"
        disabled={uploading}
        onClick={() => document.getElementById("avatar")?.click()}
      >
        {uploading ? "Uploading..." : "Upload New Avatar"}
      </Button>
    </div>
  );
}
import { toast } from '@/components/ui/use-toast';

/**
 * Image loading utilities to handle various error cases
 */

/**
 * Generate a local thumbnail for image preview
 * @param file The original image file
 * @returns A promise that resolves to a data URL for preview
 */
export const generateImageThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set dimensions (max 300px)
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        // Get data URL (medium quality for thumbnails)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to generate thumbnail'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Create a blob URL from a base64 string
 * @param base64 The base64 string
 * @returns A blob URL
 */
export const base64ToBlob = (base64: string): string => {
  try {
    // Extract the MIME type and base64 data
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const contentType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to binary
    const byteCharacters = atob(base64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error converting base64 to blob:', error);
    return '';
  }
};

/**
 * Checks if a URL is likely being blocked by browser extensions or client settings
 */
export const isLikelyBlockedUrl = (url: string): boolean => {
  // Check if URL contains common patterns that might be blocked
  return url.includes('supabase.co/storage');
};

export const handleImageLoadError = (e: React.SyntheticEvent<HTMLImageElement, Event>, url: string) => {
  console.error("Image load error:", e, "URL:", url);
  const imageElement = e.target as HTMLImageElement;
  
  // Hide the failed image
  imageElement.style.display = 'none';
  
  // Add fallback directly to parent element
  const parent = imageElement.parentElement;
  if (parent) {
    parent.innerHTML = `
      <div class="flex flex-col items-center justify-center p-4 bg-muted/30 border border-border rounded-lg">
        <span class="text-sm text-muted-foreground">Image could not be loaded</span>
        <a href="${url}" target="_blank" class="text-primary hover:underline mt-2">Open image in new tab</a>
      </div>
    `;
  }
};
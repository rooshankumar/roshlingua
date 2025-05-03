
import { toast } from '@/components/ui/use-toast';

/**
 * Image loading utilities to handle various error cases
 */

/**
 * Generate a local thumbnail for image preview
 * @param url The original image URL
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
        
        // Get data URL (low quality for thumbnails)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
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
 * Attempts to load an image with multiple fallback strategies
 * @param url The original image URL
 * @returns A promise that resolves when the image loads or all fallbacks fail
 */
export const loadImageWithFallbacks = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // First try direct loading
    const img = new Image();
    
    img.onload = () => {
      resolve(url);
    };
    
    img.onerror = () => {
      // Try with cache busting
      console.log("Trying cache busting for image:", url);
      const cacheBustUrl = `${url}?t=${Date.now()}`;
      const img2 = new Image();
      
      img2.onload = () => {
        resolve(cacheBustUrl);
      };
      
      img2.onerror = () => {
        // Try with CORS proxy if available
        if (isLikelyBlockedUrl(url)) {
          console.log("Image might be blocked, using local preview instead");
          // Return the original URL and let the fallback handle it
          resolve(url);
        } else {
          // All strategies failed
          reject(new Error("Could not load image after multiple attempts"));
        }
      };
      
      img2.src = cacheBustUrl;
    };
    
    img.src = url;
  });
};

/**
 * Checks if the image URL is likely to be blocked by privacy tools
 * @param url The image URL to check
 * @returns True if the URL matches patterns often blocked by privacy tools
 */
export const isLikelyBlockedUrl = (url: string): boolean => {
  // Check for common patterns in URLs that might be blocked
  const blockedPatterns = [
    /supabase\.co.*storage/i,
    /cloudfront\.net/i,
    /amazonaws\.com/i,
    /storage.*v1.*public/i
  ];
  
  return blockedPatterns.some(pattern => pattern.test(url));
};

/**
 * Handles image load errors with user-friendly messages
 * @param url The image URL that failed to load
 * @param filename Optional filename to show in error message
 */
export const handleImageLoadError = (url: string, filename?: string): void => {
  console.error("Image failed to load:", url);
  
  if (isLikelyBlockedUrl(url)) {
    // Don't show toasts for likely blocked URLs - just show the fallback UI
    console.log("Image likely blocked by browser. Using fallback UI.");
  } else {
    toast({
      title: "Image failed to load",
      description: `Could not load ${filename || 'image'}. Try again later.`,
      variant: "destructive"
    });
  }
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

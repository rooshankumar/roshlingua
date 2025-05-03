
import { toast } from '@/components/ui/use-toast';

/**
 * Image loading utilities to handle various error cases
 */

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
        // All strategies failed
        reject(new Error("Could not load image after multiple attempts"));
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
    /amazonaws\.com/i
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
    toast({
      title: "Image blocked by browser",
      description: "Your browser or extensions might be blocking this image. Try disabling ad blocker for this site.",
      variant: "destructive"
    });
  } else {
    toast({
      title: "Image failed to load",
      description: `Could not load ${filename || 'image'}. Try again later.`,
      variant: "destructive"
    });
  }
};

import { toast } from '@/components/ui/use-toast';

/**
 * Image loading utilities to handle various error cases
 */

/**
 * Generate a local thumbnail for image preview
 * @param file The original image file
 * @returns A promise that resolves to a data URL for preview
 */
export async function generateImageThumbnail(file: File, maxWidth = 300, maxHeight = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      if (!e.target?.result) {
        reject(new Error('Failed to read file'));
        return;
      }

      const img = new Image();
      img.src = e.target.result as string;

      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate dimensions to maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Create thumbnail as data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };

      img.onerror = function() {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

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
export function isLikelyBlockedUrl(url: string): boolean {
  // Keyword based approach (common ad/tracking domains)
  const blockedDomainKeywords = [
    'googletagmanager',
    'analytics',
    'adservice',
    'googleads',
    'doubleclick',
    'googlesyndication',
    'adsystem',
    'adnxs',
  ];

  // Also check for common patterns
  const blockedPatterns = [
    'googletagmanager.com',
    'analytics',
    'ads',
    'tracking',
    'pixel',
    'stat',
    'beacon'
  ];

  return blockedDomainKeywords.some(keyword => url.includes(keyword)) || 
         blockedPatterns.some(pattern => url.includes(pattern));
}

export const preloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }

    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

export const handleImageLoadError = (e: React.SyntheticEvent<HTMLImageElement>, imageUrl?: string, fallbackText = 'Image unavailable') => {
  const img = e.currentTarget;
  const parentElement = img.parentElement;

  // Log the error with more details
  console.error('Image load error details:', {
    src: img.src,
    originalUrl: imageUrl,
    element: img,
    error: e
  });

  // Attempt various fixes in sequence
  if (img.src.includes('?')) {
    // Try loading without query parameters first
    const cleanSrc = img.src.split('?')[0];
    console.log('Retrying image load with clean URL:', cleanSrc);

    // Only retry once to avoid infinite loop
    if (!img.dataset.retried) {
      img.dataset.retried = 'true';
      img.src = cleanSrc;
      return; // Don't show fallback yet, trying clean URL first
    }
  }

  // If URL contains supabase.co and we've already tried clean URL
  if ((img.src.includes('supabase.co') || (imageUrl && imageUrl.includes('supabase.co'))) && img.dataset.retried === 'true') {
    // Try adding cache control and random param
    const timestamp = Date.now();
    const cacheBusterUrl = `${img.src.split('?')[0]}?t=${timestamp}&cache=no-store`;
    console.log('Retrying with cache buster:', cacheBusterUrl);

    if (!img.dataset.retriedCache) {
      img.dataset.retriedCache = 'true';
      img.src = cacheBusterUrl;
      return; // Try with cache buster
    }
  }

  // If we get here, the image failed even after retries
  console.error('Image failed after all retries:', img.src);

  // Hide the broken image
  img.style.display = 'none';

  // Add a placeholder div if not already present
  if (!parentElement?.querySelector('.image-error-fallback')) {
    const fallback = document.createElement('div');
    fallback.className = 'image-error-fallback p-4 rounded bg-muted/20 text-center text-sm flex items-center justify-center';
    fallback.style.minHeight = '100px';
    fallback.style.maxWidth = '100%';
    fallback.innerHTML = `
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2 opacity-70">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span>${fallbackText}</span>
      </div>
    `;
    parentElement?.appendChild(fallback);
  }
};

// Additional utility functions for image handling
export const sanitizeUrl = (url: string): string => {
  // Handle potential tracking or blocked URLs
  return url;
};

export const compressImage = async (file: File, options = { quality: 0.8, maxWidth: 1200 }): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize if needed
      if (width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          // Create a new File
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: new Date().getTime(),
          });

          // Clean up
          URL.revokeObjectURL(img.src);

          resolve(compressedFile);
        },
        'image/jpeg',
        options.quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
  });
};

// Function to check if a file type is an image
export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

// Function to get a thumbnail preview for file
export const getFileThumbnailUrl = async (file: File): Promise<string> => {
  if (isImageFile(file.type)) {
    return URL.createObjectURL(file);
  }

  // For non-image files, return appropriate icon based on file type
  // This could be extended with more file type icons
  return '/placeholder.svg';
};

/**
 * Cleans up Supabase storage URLs to fix double slash issues
 * @param url The URL to clean
 * @returns A properly formatted URL
 */
export function cleanSupabaseUrl(url: string): string {
  if (!url) return '';

  // Fix double slashes in path (common in some Supabase URLs)
  let cleanedUrl = url.replace('//storage.googleapis.com', '/storage.googleapis.com')
                      .replace('//attachments/', '/attachments/');

  // Add cache buster if not already present
  if (!cleanedUrl.includes('t=')) {
    cleanedUrl = cleanedUrl.includes('?') 
      ? `${cleanedUrl}&t=${Date.now()}` 
      : `${cleanedUrl}?t=${Date.now()}`;
  }

  return cleanedUrl;
}

/**
 * Special URL cleaner for image tags that might be causing CORS or caching issues
 */
export function getImageSafeUrl(url: string | null | undefined): string {
  if (!url) return '';

  // First clean the URL using our standard cleaner
  const cleanedUrl = cleanSupabaseUrl(url);

  // For image tags, add additional parameters that help with browser caching issues
  return cleanedUrl + '&img=1';
}

/**
 * Enhanced image preloading that tries multiple URL formats
 */
export function preloadImageWithRetry(url: string | null | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }

    // Try with the cleaned URL first
    const cleanedUrl = cleanSupabaseUrl(url);

    const img = new Image();
    let attempts = 0;
    const maxAttempts = 3;

    const tryLoad = (attemptUrl: string) => {
      attempts++;
      console.log(`Preload attempt ${attempts}/${maxAttempts} with URL: ${attemptUrl}`);

      img.onload = () => resolve(attemptUrl);
      img.onerror = () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Failed to load image after ${maxAttempts} attempts`));
          return;
        }

        // Try different URL formats
        if (attempts === 1) {
          // Try without any parameters
          tryLoad(url.split('?')[0]);
        } else if (attempts === 2) {
          // Try with forced no-cache
          tryLoad(`${url.split('?')[0]}?no-cache=${Date.now()}`);
        }
      };

      img.src = attemptUrl;
    };

    // Start the first attempt
    tryLoad(cleanedUrl);
  });
}

import { supabase } from '@/lib/supabase';

/**
 * Utility function to check if a URL is a valid image
 * @param url The image URL to check
 * @returns A Promise that resolves to a valid URL or a placeholder
 */
export function validateImageUrl(url: string | null | undefined): Promise<string> {
  return new Promise((resolve) => {
    if (!url) {
      resolve('/placeholder.svg');
      return;
    }

    // If it's a Supabase storage URL, check if it exists
    if (url.includes('supabase')) {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve('/placeholder.svg');
      img.src = url;
    } else {
      // For external URLs
      resolve(url);
    }
  });
}

/**
 * Generates a URL for a Supabase storage file
 */
export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '/placeholder.svg';
  }
}

// Generate thumbnail from an image file
export const generateImageThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas with smaller dimensions
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the image on canvas
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to data URL with reduced quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Function to handle image load errors with multiple fallback approaches
export const handleImageLoadError = (imgElement: HTMLImageElement, originalUrl: string) => {
  console.error('Image failed to load:', originalUrl);

  // Track retry attempts
  const retryCount = parseInt(imgElement.dataset.retryCount || '0', 10);
  if (retryCount >= 3) {
    console.error('Max retries reached for image:', originalUrl);
    return false;
  }

  imgElement.dataset.retryCount = (retryCount + 1).toString();

  // Different strategies based on retry count
  switch (retryCount) {
    case 0:
      // First retry: add cache buster
      imgElement.src = `${originalUrl.split('?')[0]}?t=${Date.now()}`;
      break;
    case 1:
      // Second retry: fix path issues and add no-cache
      imgElement.src = `${originalUrl.replace('//attachments/', '/attachments/').split('?')[0]}?t=${Date.now()}&cache=no-store`;
      break;
    case 2:
      // Last attempt: try completely clean URL
      imgElement.src = originalUrl.split('?')[0];
      break;
  }

  return true;
};
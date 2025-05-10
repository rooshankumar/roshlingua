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

  return blockedDomainKeywords.some(keyword => url.includes(keyword));
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

export const handleImageLoadError = (event: React.SyntheticEvent<HTMLImageElement, Event>, fallbackText = "Image failed to load") => {
  const img = event.target as HTMLImageElement;
  const src = img.src;

  console.error(`Image failed to load: ${src}`);

  // Set the alt text to provide context about the failed image
  img.alt = fallbackText;

  // First, check if this is a Supabase URL
  if (src.includes('supabase.co/storage')) {
    // Extract the bucket name for diagnosis
    const bucketMatch = src.match(/\/public\/([^\/]+)\//);
    if (bucketMatch && bucketMatch[1]) {
      const bucketName = bucketMatch[1];
      console.log(`Bucket name detected in URL: '${bucketName}'`);
    }

    // Try to load with cache busting if it's a Supabase URL and we haven't already
    if (!src.includes('t=')) {
      const timestamp = Date.now();
      const newSrc = `${src}${src.includes('?') ? '&' : '?'}t=${timestamp}`;
      console.log(`Retrying with cache busting: ${newSrc}`);
      img.src = newSrc;
      return;
    }
  }

  // If we already tried cache busting or it's not a Supabase URL, hide the broken image
  img.style.display = 'none';

  // Add a helpful fallback element
  const parent = img.parentNode;
  if (parent) {
    const fallbackElement = document.createElement('div');
    fallbackElement.className = 'p-2 rounded-md text-sm text-center';
    fallbackElement.innerText = src.includes('supabase.co/storage') ? 
      'Storage error: Please check if bucket exists in your Supabase project' : 
      fallbackText;
    parent.appendChild(fallbackElement);
  }
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

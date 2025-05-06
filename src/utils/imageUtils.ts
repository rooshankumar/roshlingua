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

export const handleImageLoadError = (e: React.SyntheticEvent<HTMLImageElement, Event>, url: string) => {
  console.error("Image load error:", e, "URL:", url);
  const imageElement = e.target as HTMLImageElement;

  // Hide the failed image
  imageElement.style.display = 'none';

  // Check if URL might be blocked (common for Supabase storage)
  const isBlocked = url && isLikelyBlockedUrl(url);

  // Create safer, escaped URL
  const safeUrl = url ? url.replace(/"/g, '&quot;') : '';

  // Add fallback directly to parent element
  const parent = imageElement.parentElement;
  if (parent) {
    // Use createElement instead of innerHTML for better security
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = "flex flex-col items-center justify-center p-4 bg-muted/30 border border-border rounded-lg";

    const messageSpan = document.createElement('span');
    messageSpan.className = "text-sm text-muted-foreground";
    messageSpan.textContent = isBlocked ? 
      "Image may be blocked by your browser" : 
      "Image could not be loaded";

    const linkElement = document.createElement('a');
    linkElement.href = safeUrl;
    linkElement.target = "_blank";
    linkElement.className = "text-primary hover:underline mt-2";
    linkElement.textContent = "Open image in new tab";

    fallbackDiv.appendChild(messageSpan);
    fallbackDiv.appendChild(linkElement);

    // Clear existing content and append the new elements
    parent.innerHTML = '';
    parent.appendChild(fallbackDiv);
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
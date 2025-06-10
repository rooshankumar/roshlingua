import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt, ...props }, ref) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(src);
  const [hasError, setHasError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = React.useCallback(() => {
    console.warn('Avatar image failed to load:', imgSrc, 'Retry count:', retryCount);

    if (retryCount < 2 && imgSrc) {
      // Try with cache busting
      const separator = imgSrc.includes('?') ? '&' : '?';
      const retryUrl = `${imgSrc}${separator}retry=${retryCount + 1}&t=${Date.now()}`;
      setImgSrc(retryUrl);
      setRetryCount(prev => prev + 1);
    } else {
      setHasError(true);
      setImgSrc(undefined);
    }
  }, [imgSrc, retryCount]);

  const handleLoad = React.useCallback(() => {
    console.log('Avatar image loaded successfully:', imgSrc);
  }, [imgSrc]);

  if (hasError || !imgSrc) {
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full object-cover", className)}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    delayMs={600}
    {...props}
  >
      {children || (props.src ? props.alt?.charAt(0).toUpperCase() : '?')}
  </AvatarPrimitive.Fallback>
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
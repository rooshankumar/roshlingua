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
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & { onError?: React.ReactEventHandler<HTMLImageElement> }
>(({ className, onError, ...props }, ref) => {
  const handleError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Avatar image failed to load:', props.src);
    if (e.currentTarget.src !== '/placeholder.svg') {
      e.currentTarget.src = '/placeholder.svg';
    }
    if (onError) {
      onError(e);
    }
  }, [onError, props.src]);

  return (
    <AvatarPrimitive.Image
      {...props}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
        (e.target as HTMLImageElement).onerror = null;
      }}
      ref={ref}
      className={cn("aspect-square h-full w-full object-cover", className)}
    />
  );
})
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
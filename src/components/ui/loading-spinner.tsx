
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  return (
    <div className="flex items-center justify-center">
      <div className={cn(
        "border-4 border-primary/20 border-t-primary rounded-full animate-spin",
        sizeClasses[size],
        className
      )} />
    </div>
  )
}

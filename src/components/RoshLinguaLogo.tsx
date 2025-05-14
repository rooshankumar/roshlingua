import { cn } from "@/lib/utils";

interface RoshLinguaLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const RoshLinguaLogo = ({ className, width = 200, height = 200 }: RoshLinguaLogoProps) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <img 
        src="/favicon.svg" 
        alt="RoshLingua" 
        width={width} 
        height={height}
        className="object-contain"
      />
    </div>
  );
};
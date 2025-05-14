import { cn } from "@/lib/utils";

interface ParrotMascotProps {
  className?: string;
  width?: number;
  height?: number;
  showSpeechBubble?: boolean;
}

const ParrotMascot = ({ 
  className, 
  width = 200, 
  height = 200,
  showSpeechBubble = true 
}: ParrotMascotProps) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <img 
        src="/favicon.svg" 
        alt="RoshLingua Parrot Mascot" 
        width={width} 
        height={height}
        className="object-contain"
      />
    </div>
  );
};

export default ParrotMascot;
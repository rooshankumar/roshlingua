
import React from "react";

interface ParrotMascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  withSpeechBubble?: boolean;
}

const ParrotMascot: React.FC<ParrotMascotProps> = ({
  size = "md",
  className = "",
  withSpeechBubble = true
}) => {
  const sizeMap = {
    sm: { width: 36, height: 36 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 80, height: 80 },
  };

  // Ensure we use a valid size key or default to md
  const validSize = (sizeMap[size] ? size : "md") as keyof typeof sizeMap;
  const { width, height } = sizeMap[validSize];

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width={width} height={height}>
        {/* Body */}
        <path d="M256 380 Q360 380 390 320 Q420 260 370 220 Q340 190 300 200 Z" fill="#1EB8B8" />
        
        {/* Wing */}
        <path d="M320 290 Q350 260 320 220 Q290 180 260 200 Z" fill="#00635D" />
        
        {/* Head */}
        <circle cx="240" cy="200" r="120" fill="#FF3355" />
        
        {/* Beak */}
        <path d="M170 210 L120 220 L170 240 Z" fill="#FF7722" />
        
        {/* Eye */}
        <circle cx="200" cy="190" r="30" fill="#FFFFFF" />
        <circle cx="200" cy="190" r="15" fill="#003344" />
        
        {/* Hat with Text */}
        <path d="M230 110 Q240 80 280 80 Q320 80 330 110 Q340 140 290 140 Q230 140 230 110 Z" fill="#1D65E0" />
        <circle cx="280" cy="65" r="25" fill="#1D65E0" />
        
        {/* Hat Band with ROSHLINGUA text */}
        <path d="M220 125 Q270 125 320 125 Q350 125 350 115 Q350 105 320 105 Q270 105 220 105 Q190 105 190 115 Q190 125 220 125 Z" fill="#1D65E0" />
        
        {/* Scarf */}
        <path d="M210 260 Q240 280 280 270 Q320 260 340 240 Q360 240 380 260 Q390 280 380 300 Q360 320 330 310 Z" fill="#FFBB00" />
        
        {/* Feet */}
        <path d="M260 380 L240 410 L260 410 Z" fill="#FF7722" />
        <path d="M300 380 L320 410 L300 410 Z" fill="#FF7722" />

        {/* Speech bubble (only if withSpeechBubble is true) */}
        {withSpeechBubble && (
          <>
            <circle cx="420" cy="170" r="70" fill="#FFF6E5" opacity="0.8" />
            <circle cx="400" cy="170" r="7" fill="#003344" />
            <circle cx="430" cy="170" r="7" fill="#003344" />
            <circle cx="460" cy="170" r="7" fill="#003344" />
          </>
        )}
      </svg>
    </div>
  );
};

export default ParrotMascot;


import React from "react";

interface FoxMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
}

const FoxMascot: React.FC<FoxMascotProps> = ({ 
  className = "", 
  size = "md", 
  animate = false 
}) => {
  // Size mapping
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-36 h-36"
  };

  const sizeClass = sizeMap[size];
  const animationClass = animate ? "animate-bounce" : "";

  return (
    <div className={`relative ${sizeClass} ${animationClass} ${className}`}>
      {/* Fox SVG */}
      <svg 
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Body */}
        <ellipse cx="50" cy="60" rx="30" ry="25" fill="#FF6B1A" />
        
        {/* Head */}
        <circle cx="50" cy="35" r="20" fill="#FF6B1A" />
        
        {/* Ears */}
        <polygon points="30,25 35,10 40,25" fill="#FF6B1A" />
        <polygon points="70,25 65,10 60,25" fill="#FF6B1A" />
        
        {/* Inner ears */}
        <polygon points="32,25 35,15 38,25" fill="#E55A09" />
        <polygon points="68,25 65,15 62,25" fill="#E55A09" />
        
        {/* Face */}
        <ellipse cx="50" cy="40" rx="15" ry="12" fill="#FFFFFF" />
        
        {/* Eyes */}
        <circle cx="42" cy="35" r="3" fill="#333333" />
        <circle cx="58" cy="35" r="3" fill="#333333" />
        
        {/* Eye highlights */}
        <circle cx="43" cy="34" r="1" fill="#FFFFFF" />
        <circle cx="59" cy="34" r="1" fill="#FFFFFF" />
        
        {/* Nose */}
        <path d="M50,42 Q53,45 50,48 Q47,45 50,42" fill="#333333" />
        
        {/* Mouth */}
        <path d="M50,48 Q56,50 60,48" fill="none" stroke="#333333" strokeWidth="1" />
        <path d="M50,48 Q44,50 40,48" fill="none" stroke="#333333" strokeWidth="1" />
        
        {/* Whiskers */}
        <line x1="50" y1="45" x2="65" y2="43" stroke="#333333" strokeWidth="0.7" />
        <line x1="50" y1="46" x2="65" y2="46" stroke="#333333" strokeWidth="0.7" />
        <line x1="50" y1="47" x2="65" y2="49" stroke="#333333" strokeWidth="0.7" />
        
        <line x1="50" y1="45" x2="35" y2="43" stroke="#333333" strokeWidth="0.7" />
        <line x1="50" y1="46" x2="35" y2="46" stroke="#333333" strokeWidth="0.7" />
        <line x1="50" y1="47" x2="35" y2="49" stroke="#333333" strokeWidth="0.7" />
        
        {/* Tail */}
        <path d="M80,60 Q95,40 85,30 Q75,35 80,60" fill="#FF6B1A" />
        <path d="M82,55 Q90,40 85,35" fill="none" stroke="#E55A09" strokeWidth="2" />
      </svg>
    </div>
  );
};

export default FoxMascot;

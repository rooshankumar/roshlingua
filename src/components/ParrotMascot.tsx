
import React from "react";

interface ParrotMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
}

const ParrotMascot: React.FC<ParrotMascotProps> = ({ 
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
      <img 
        src="/images/roshlingua-bird.png" 
        alt="RoshLingua Bird"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default ParrotMascot;

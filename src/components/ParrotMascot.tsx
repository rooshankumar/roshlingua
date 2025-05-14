
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
      {/* Parrot SVG */}
      <svg 
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Body */}
        <ellipse cx="55" cy="55" rx="25" ry="30" fill="#0CA789" />
        
        {/* Wing */}
        <path d="M50,45 Q80,55 75,85 Q65,75 50,65 Z" fill="#08856D" />
        
        {/* Head */}
        <circle cx="45" cy="35" r="20" fill="#F92F60" />
        
        {/* Beak */}
        <path d="M30,35 L15,40 L30,45 Z" fill="#FFCC00" />
        
        {/* Eye */}
        <circle cx="38" cy="33" r="3" fill="#FFFFFF" />
        <circle cx="38" cy="33" r="1.5" fill="#000000" />
        
        {/* Tail feathers */}
        <path d="M75,60 Q95,50 90,70 Q85,75 75,70 Z" fill="#F7A400" />
        <path d="M75,65 Q95,75 85,85 Q80,80 75,75 Z" fill="#5840F5" />
        
        {/* Chest */}
        <path d="M40,45 Q50,65 35,80 Q25,70 30,45 Z" fill="#FFD700" />
        
        {/* Feet */}
        <path d="M45,85 L50,95 L55,85" stroke="#FFCC00" strokeWidth="2" fill="none" />
        <path d="M60,85 L65,95 L70,85" stroke="#FFCC00" strokeWidth="2" fill="none" />
        
        {/* Head detail */}
        <path d="M45,20 Q55,15 60,25" stroke="#E01E5A" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
};

export default ParrotMascot;

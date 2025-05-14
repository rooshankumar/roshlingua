
import React from "react";

interface ParrotMascotProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ParrotMascot: React.FC<ParrotMascotProps> = ({ 
  size = "md", 
  className = "" 
}) => {
  // Size mapping for the SVG dimensions
  const sizeMap = {
    sm: { width: 36, height: 36 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
  };

  const { width, height } = sizeMap[size];

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg transition-transform duration-300 hover:scale-105"
      >
        {/* Body */}
        <path d="M60 110C75 110 95 95 95 65C95 40 80 25 60 25C40 25 25 40 25 65C25 95 45 110 60 110Z" fill="#FF6B1A" />
        
        {/* Shadow/highlight on body */}
        <path d="M60 110C75 110 95 95 95 65C95 40 85 30 75 27.5C65 25 55 45 50 65C45 85 45 110 60 110Z" fill="#FF8C44" />
        
        {/* Wing */}
        <path d="M30 70C25 60 25 50 30 40C35 30 35 50 35 60C35 70 35 80 30 70Z" fill="#1A1E23" />
        
        {/* Tail feathers */}
        <path d="M70 100C80 105 90 100 95 90C100 80 85 95 80 95C75 95 70 95 70 100Z" fill="#1A1E23" />
        
        {/* Beak */}
        <path d="M75 50C85 50 90 55 85 60C80 65 70 60 75 50Z" fill="#1A1E23" />
        
        {/* Face mask */}
        <path d="M50 35C45 40 45 60 55 60C65 60 70 45 65 35C60 25 55 30 50 35Z" fill="#FFFFFF" />
        
        {/* Eye */}
        <circle cx="57.5" cy="45" r="7.5" fill="#1A1E23" />
        <circle cx="55" cy="42.5" r="2.5" fill="#FFFFFF" />
        
        {/* Feet */}
        <path d="M50 105C45 105 45 110 50 110C55 110 55 105 50 105Z" fill="#1A1E23" />
        <path d="M70 105C65 105 65 110 70 110C75 110 75 105 70 105Z" fill="#1A1E23" />
        
        {/* Shine/Highlight effect */}
        <path d="M50 35C55 30 65 40 60 45C55 50 45 40 50 35Z" fill="#FFFFFF" fillOpacity="0.6" />
      </svg>
    </div>
  );
};

export default ParrotMascot;

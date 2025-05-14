
import React from "react";
import ParrotMascot from "./ParrotMascot";
import { cn } from "@/lib/utils";

interface RoshLinguaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  textOnly?: boolean;
  darkMode?: boolean;
  rightAligned?: boolean;
}

const RoshLinguaLogo: React.FC<RoshLinguaLogoProps> = ({
  className,
  size = "md",
  textOnly = false,
  darkMode = false,
  rightAligned = true,
}) => {
  const sizeMap = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  const fontSizeClass = sizeMap[size];
  const textClass = darkMode ? "text-white" : "text-gray-800";

  return (
    <div className={cn(
      "flex items-center gap-2", 
      rightAligned ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {!textOnly && (
        <div className={`relative ${rightAligned ? "ml-1" : "mr-1"}`}>
          <ParrotMascot 
            size={size === "sm" ? "sm" : size === "md" ? "md" : "lg"} 
            className="animate-pulse-slow" 
          />
        </div>
      )}
      <div className={cn("font-bold flex items-center", fontSizeClass)}>
        <span className="text-orange-500 font-extrabold tracking-tight">rosh</span>
        <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent font-extrabold tracking-tight">Lingua</span>
      </div>
    </div>
  );
};

export default RoshLinguaLogo;

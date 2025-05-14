
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
  rightAligned = false,
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
            size={size} 
            className="animate-pulse-slow"
            withSpeechBubble={false}
          />
        </div>
      )}
      <div className={cn("font-bold flex items-center", fontSizeClass)}>
        {size === "lg" || size === "xl" ? (
          <span className="bg-gradient-to-r from-[#FF3355] via-[#1D65E0] to-[#1EB8B8] bg-clip-text text-transparent font-extrabold tracking-tight">
            roshLingua
          </span>
        ) : (
          <>
            <span className="text-[#FF3355] font-extrabold tracking-tight">rosh</span>
            <span className="text-[#1D65E0] font-extrabold tracking-tight">Lingua</span>
          </>
        )}
      </div>
    </div>
  );
};

export default RoshLinguaLogo;

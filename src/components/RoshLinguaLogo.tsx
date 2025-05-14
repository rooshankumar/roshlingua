
import React from "react";
import FoxMascot from "./FoxMascot";
import { cn } from "@/lib/utils";

interface RoshLinguaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  textOnly?: boolean;
  darkMode?: boolean;
}

const RoshLinguaLogo: React.FC<RoshLinguaLogoProps> = ({
  className,
  size = "md",
  textOnly = false,
  darkMode = false,
}) => {
  const sizeMap = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const fontSizeClass = sizeMap[size];
  const textClass = darkMode ? "text-white" : "text-gray-800";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!textOnly && (
        <div className="relative">
          <FoxMascot 
            size={size === "sm" ? "sm" : size === "md" ? "md" : "lg"} 
          />
        </div>
      )}
      <div className={cn("font-bold flex items-center", fontSizeClass)}>
        <span className="text-orange-500">rosh</span>
        <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">Lingua</span>
      </div>
    </div>
  );
};

export default RoshLinguaLogo;

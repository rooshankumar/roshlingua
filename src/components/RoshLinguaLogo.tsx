
import React from "react";
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

  const logoSizeMap = {
    sm: 30,
    md: 40,
    lg: 60,
  };

  const fontSizeClass = sizeMap[size];
  const textClass = darkMode ? "text-white" : "text-gray-800";
  const logoSize = logoSizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!textOnly && (
        <div className="relative">
          <img 
            src="/images/roshlingua-bird.png" 
            alt="RoshLingua Bird"
            width={logoSize}
            height={logoSize}
            className="object-contain"
          />
        </div>
      )}
      <div className={cn("font-bold flex items-center", fontSizeClass)}>
        <span className="text-blue-600">ROSH</span>
        <span className="text-red-500">LINGUA</span>
      </div>
    </div>
  );
};

export default RoshLinguaLogo;

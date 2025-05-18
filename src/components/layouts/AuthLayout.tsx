
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import PageTransition from "@/components/PageTransition";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
      
      {/* Logo Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/images/roshlingua-bird.png"
            alt="RoshLingua Background"
            className="w-[800px] h-[800px] object-contain opacity-[0.02]"
          />
        </div>
        <div className="absolute inset-0 bg-white/40" />
      </div>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </div>
  );
};

export default AuthLayout;

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
      {/* Logo Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <img 
            src="/images/roshlingua-bird.png"
            alt="RoshLingua Background"
            className="w-[800px] h-[800px] object-contain"
          />
        </div>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
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
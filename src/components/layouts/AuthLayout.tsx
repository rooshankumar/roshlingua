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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-white">
      {/* Logo Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/images/roshlingua-bird.png"
            alt="RoshLingua Background"
            className="w-screen h-screen object-contain opacity-[0.03]"
          />
        </div>
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
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
      {/* Brand Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://05579550-cab8-4a15-939a-d1ecea38b48a-00-2atevqlq7sjp.sisko.replit.dev/auth"
          alt="Brand Background"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
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
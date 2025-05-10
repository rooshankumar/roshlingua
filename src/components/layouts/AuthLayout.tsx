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
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop={true}
          muted 
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/277318_tiny.mp4" type="video/mp4" />
        </video>
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
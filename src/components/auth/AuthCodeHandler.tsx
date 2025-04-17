
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Only handle if we're at the root level and have a code in the URL
    const handleRootCode = async () => {
      // Check if we're at the root level and have a code in the URL
      if (location.pathname === '/' && location.hash.includes('access_token')) {
        console.log("Detected auth code at root level, redirecting to proper handler...");
        
        // Redirect to the auth callback handler
        navigate('/auth/callback' + location.hash, { replace: true });
        return;
      }
      
      // Also check for code in hash
      if (location.pathname === '/' && location.hash.includes('code=')) {
        console.log("Detected auth code in hash at root level");
        
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (error) {
            console.error("Code exchange error:", error);
            toast({
              variant: "destructive",
              title: "Authentication failed",
              description: "Failed to complete authentication"
            });
            navigate('/auth', { replace: true });
            return;
          }
          
          if (data.session) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/auth', { replace: true });
          }
        } catch (err) {
          console.error("Auth code handling error:", err);
          toast({
            variant: "destructive",
            title: "Authentication error",
            description: "Something went wrong during authentication"
          });
          navigate('/auth', { replace: true });
        }
      }
    };
    
    handleRootCode();
  }, [location, navigate, toast]);
  
  return null; // This component doesn't render anything
};

export default AuthCodeHandler;

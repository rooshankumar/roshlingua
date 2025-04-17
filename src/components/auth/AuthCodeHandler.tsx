
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/**
 * Component that handles OAuth codes at the root path
 * This is necessary for Vercel deployments where redirects may go to root
 */
const AuthCodeHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const handleRootCode = async () => {
      // Only run on root path with code parameter
      if (location.pathname === '/' && location.search.includes('code=')) {
        console.log("Auth code detected at root, exchanging code directly...");
        
        try {
          // Extract the code from the URL
          const params = new URLSearchParams(location.search);
          const code = params.get('code');
          
          if (!code) {
            throw new Error("No auth code found in URL");
          }
          
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            throw error;
          }
          
          if (data?.session) {
            console.log("Session created successfully, redirecting...");
            // Navigate to dashboard after successful authentication
            navigate('/dashboard', { replace: true });
          } else {
            throw new Error("No session returned after code exchange");
          }
        } catch (error) {
          console.error("Error processing auth code:", error);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: error instanceof Error ? error.message : "Failed to process authentication"
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

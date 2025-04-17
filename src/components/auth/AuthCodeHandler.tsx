
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/**
 * Component that redirects OAuth codes to the proper callback handler
 * This is necessary for Vercel deployments where redirects may go to root
 */
const AuthCodeHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Only run on root path with code parameter
    if (location.pathname === '/' && location.search.includes('code=')) {
      console.log("Auth code detected at root, redirecting to callback handler...");
      // Redirect to the proper callback endpoint
      navigate(`/auth/callback${location.search}`, { replace: true });
    }
  }, [location, navigate]);
  
  return null; // This component doesn't render anything
};

export default AuthCodeHandler;

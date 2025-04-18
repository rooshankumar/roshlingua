import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle authentication in component mount
  useEffect(() => {
    // Check if we have any authentication parameters
    const url = new URL(window.location.href);
    const hasAuthParams = url.searchParams.has('code') || url.searchParams.has('error');

    if (hasAuthParams) {
      console.log("Detected authentication parameters - redirecting to callback handler");

      // If we're not already in callback page, redirect there
      if (!window.location.pathname.includes('/auth/callback')) {
        // Navigate to the dedicated callback page that handles auth
        window.location.href = `/auth/callback${window.location.search}`;
      }
    }
  }, [navigate, toast]);

  return null;
};

export default AuthCodeHandler;
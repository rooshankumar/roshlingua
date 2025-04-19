import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase, clearAllAuthData } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Track if we're actively redirecting to prevent infinite loops
  const processingAuthRef = useRef(false);

  // Check for OAuth errors first
  useEffect(() => {
    if (processingAuthRef.current) return;
    
    const url = new URL(window.location.href);
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    // Check for common OAuth errors
    if (error) {
      console.error(`OAuth error detected: ${error} - ${errorDescription}`);
      setError(errorDescription || error);
      
      // Handle "bad_oauth_state" error specifically - very common issue
      if (error === 'invalid_request' && errorDescription?.includes('bad_oauth_state')) {
        console.log('Bad OAuth state detected - clearing all auth data and redirecting');
        clearAllAuthData();
        
        // Delay redirect slightly to allow error to be displayed
        processingAuthRef.current = true;
        setTimeout(() => {
          navigate('/auth', { replace: true });
          processingAuthRef.current = false;
        }, 1500);
        return;
      }
    }
  }, [navigate]);

  // Handle authentication process
  useEffect(() => {
    if (isProcessing || error || processingAuthRef.current) return;
    
    let isMounted = true;
    setIsProcessing(true);
    
    const handleAuthProcess = async () => {
      try {
        console.log("Starting auth handler process");
        const url = new URL(window.location.href);
        
        // First check for error parameters
        const urlError = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        
        if (urlError) {
          console.error(`Auth error from URL: ${urlError} - ${errorDescription}`);
          throw new Error(errorDescription || urlError);
        }
        
        // Check for code in URL (PKCE flow)
        const code = url.searchParams.get('code');
        
        // Check for hash fragment with token (implicit flow)
        const hash = window.location.hash;
        const hasHashToken = hash && hash.includes('access_token=');
        
        // If we have session, use it and check profile
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          console.log("Found existing session, checking profile");
          await handleUserProfile(sessionData.session.user);
          return;
        }
        
        // If we have token in hash, process implicit flow
        if (hasHashToken) {
          console.log("Processing token from URL hash");
          await handleImplicitFlow(hash);
          return;
        }
        
        // If we have code in URL, process PKCE flow
        if (code) {
          console.log("Processing auth code from URL");
          await handlePKCEFlow(code);
          return;
        }
        
        // No auth data found, redirect to login
        if (window.location.pathname.includes('/auth/callback')) {
          console.log("No auth data found but we're on the callback page, redirecting to login");
          processingAuthRef.current = true;
          navigate('/auth', { replace: true });
        } else {
          console.log("No auth data found on non-callback page, not redirecting");
          setIsProcessing(false);
        }
        
      } catch (error) {
        console.error("Auth process error:", error);
        
        if (isMounted) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: error.message || "Failed to process authentication"
          });
          
          // Clear auth data only if the error appears to be auth-related
          if (error.message && (
            error.message.includes('auth') || 
            error.message.includes('token') || 
            error.message.includes('session') ||
            error.message.includes('OAuth') ||
            error.message.includes('verification') ||
            error.message.includes('PKCE') ||
            error.message.includes('state')
          )) {
            console.log("Clearing auth data due to auth-related error");
            clearAllAuthData();
          }
          
          processingAuthRef.current = true;
          navigate('/auth', { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsProcessing(false);
          setTimeout(() => {
            processingAuthRef.current = false;
          }, 1000);
        }
      }
    };
    
    // Handle token in hash fragment (implicit flow)
    const handleImplicitFlow = async (hash) => {
      try {
        // Extract tokens from hash
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const expiresAt = hashParams.get('expires_at');
        const tokenType = hashParams.get('token_type');
        
        if (!accessToken) {
          throw new Error("No access token found in URL hash");
        }
        
        // Set session with the token
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_in: expiresIn ? parseInt(expiresIn) : 3600,
          expires_at: expiresAt ? parseInt(expiresAt) : Math.floor(Date.now() / 1000) + 3600,
          token_type: tokenType || 'bearer',
        });
        
        if (error) throw error;
        
        // Remove hash from URL
        if (window.history?.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
        
        // Handle user profile
        if (data?.user) {
          await handleUserProfile(data.user);
        } else {
          throw new Error("No user found in session");
        }
      } catch (error) {
        console.error("Implicit flow error:", error);
        throw error;
      }
    };
    
    // Handle auth code (PKCE flow)
    const handlePKCEFlow = async (code) => {
      try {
        // Try to exchange code for session with multiple retries
        let data = null;
        let sessionError = null;
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Exchanging code for session (attempt ${attempt + 1})`);
            const result = await supabase.auth.exchangeCodeForSession(code);
            
            if (!result.error) {
              data = result.data;
              break;
            }
            
            sessionError = result.error;
            console.error(`Exchange attempt ${attempt + 1} failed:`, sessionError);
            
            // Wait before retry
            await new Promise(r => setTimeout(r, 500));
          } catch (err) {
            console.error(`Exchange exception (attempt ${attempt + 1}):`, err);
            sessionError = err;
            await new Promise(r => setTimeout(r, 500));
          }
        }
        
        if (sessionError) throw sessionError;
        if (!data?.session) throw new Error("Failed to establish session");
        
        // Handle user profile
        await handleUserProfile(data.session.user);
        
      } catch (error) {
        console.error("PKCE flow error:", error);
        
        // Check for PKCE-specific errors
        if (error.message && (
          error.message.includes('PKCE') || 
          error.message.includes('verifier') || 
          error.message.includes('verification')
        )) {
          console.log("PKCE verification error, clearing all auth data");
          clearAllAuthData();
        }
        
        throw error;
      }
    };
    
    // Handle user profile creation/check
    const handleUserProfile = async (user) => {
      if (!user) {
        throw new Error("No user data provided");
      }
      
      try {
        console.log("Handling profile for user:", user.id);
        
        // Get profile with retry for potential 406 errors
        let profileData = null;
        let profileError = null;
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Fetching profile (attempt ${attempt + 1})`);
            
            const { data, error } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', user.id)
              .single();
              
            if (!error) {
              profileData = data;
              break;
            }
            
            profileError = error;
            console.log(`Profile fetch attempt ${attempt + 1} failed:`, error);
            
            // Wait before retry
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
          } catch (err) {
            console.error(`Profile fetch exception (attempt ${attempt + 1}):`, err);
            profileError = err;
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
          }
        }
        
        // If profile not found, create a new one
        if (!profileData) {
          console.log("No profile found, creating new profile");
          const userMetadata = user.user_metadata || {};
          
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: userMetadata.full_name || userMetadata.name || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false
            }, { onConflict: 'id' });
            
          if (upsertError) {
            console.error("Error creating profile:", upsertError);
            // Continue anyway - we'll redirect to onboarding
          }
          
          // Always send new users to onboarding
          processingAuthRef.current = true;
          navigate('/onboarding', { replace: true });
          return;
        }
        
        // Profile exists, check onboarding status
        console.log("Profile found, onboarding status:", profileData.onboarding_completed);
        processingAuthRef.current = true;
        navigate(profileData.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
        
      } catch (error) {
        console.error("Profile handling error:", error);
        // Default to onboarding on error
        processingAuthRef.current = true;
        navigate('/onboarding', { replace: true });
      }
    };
    
    handleAuthProcess();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, toast, isProcessing, error]);
  
  // Only show loading UI if we're explicitly on the callback page or processing auth
  const showLoadingUI = window.location.pathname.includes('/auth/callback') || isProcessing;
  
  if (!showLoadingUI) {
    return null;
  }
  
  // Display loading or error state
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80">
      <div className="max-w-md w-full p-6 text-center">
        {error ? (
          <div className="space-y-4">
            <div className="animate-pulse h-12 w-12 bg-destructive/20 rounded-full mx-auto"></div>
            <h2 className="text-xl font-semibold">Authentication Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm">Redirecting you to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="animate-pulse h-12 w-12 bg-primary/20 rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Processing authentication...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCodeHandler;
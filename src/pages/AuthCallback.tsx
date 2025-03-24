
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Processing auth callback");
        
        // Process the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          throw error;
        }
        
        if (data.session) {
          console.log("Auth successful, checking user data");
          const userId = data.session.user.id;
          const userEmail = data.session.user.email;
          const userName = data.session.user.user_metadata?.full_name || 
                          data.session.user.user_metadata?.name || 
                          'New User';
          
          // First check if user already exists in the users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();
          
          if (userError && userError.code !== 'PGRST116') {
            console.error("Error checking user:", userError);
            // Continue with auth flow, we'll try to create the user
          }
          
          // If user doesn't exist, create the user record first
          if (!userData) {
            console.log("Creating new user record");
            
            try {
              // Call the Supabase function to create a user with onboarding status
              const { data: funcData, error: funcError } = await supabase.rpc(
                'create_user_with_onboarding',
                {
                  p_user_id: userId,
                  p_email: userEmail,
                  p_full_name: userName
                }
              );
              
              if (funcError) {
                console.error("Error creating user with function:", funcError);
                // Try direct insert as fallback
                const { error: insertError } = await supabase
                  .from('users')
                  .insert({
                    id: userId,
                    email: userEmail,
                    full_name: userName,
                    native_language: 'English',
                    learning_language: 'Spanish',
                    proficiency_level: 'Beginner (A1)'
                  });
                
                if (insertError) {
                  console.error("Error creating user record:", insertError);
                  throw insertError;
                }
                
                // Create onboarding record
                const { error: onboardingError } = await supabase
                  .from('onboarding_status')
                  .insert({
                    user_id: userId,
                    is_complete: false,
                    current_step: 'profile'
                  });
                
                if (onboardingError) {
                  console.error("Error creating onboarding status:", onboardingError);
                  // Continue anyway, we don't want to block the user
                }
              } else {
                console.log("User created with function:", funcData);
              }
              
              // Redirect to onboarding
              toast({
                title: "Account created",
                description: "Welcome to Languagelandia! Let's set up your profile.",
              });
              
              navigate('/onboarding', { replace: true });
              return;
              
            } catch (createError) {
              console.error("Error in user creation:", createError);
              // Continue with auth flow, try redirect to dashboard
            }
          }
          
          // Check if user needs onboarding
          const { data: onboardingData, error: onboardingError } = await supabase
            .from('onboarding_status')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (onboardingError && onboardingError.code !== 'PGRST116') {
            console.error("Error checking onboarding status:", onboardingError);
          }
          
          toast({
            title: "Login successful",
            description: "Welcome to Languagelandia!",
          });
          
          if (onboardingData && !onboardingData.is_complete) {
            navigate('/onboarding', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          console.error("No session found after authentication");
          setError("Authentication failed. Please try again.");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
          <h2 className="font-bold">Authentication Error</h2>
          <p>{error}</p>
        </div>
        <a href="/auth" className="text-primary underline">
          Back to Login
        </a>
      </div>
    );
  }

  // If for some reason we get here (we should have redirected already)
  return <Navigate to="/dashboard" replace />;
};

export default AuthCallback;

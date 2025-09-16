import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Processing authentication callback...");
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          console.error("Auth provider error:", error, errorDescription);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || error
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (!code) {
          console.log("No auth code present, redirecting to auth");
          navigate('/auth', { replace: true });
          return;
        }

        // Exchange the code for a session; Supabase SDK reads PKCE verifier from storage
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          throw sessionError;
        }

        if (!data?.session) {
          throw new Error("No session returned");
        }

        // PKCE verifier will expire naturally; no need to clear immediately here

        // Ensure profile is updated with provider metadata if needed
        const user = data.session.user;
        const fullName = (user.user_metadata?.full_name) || (user.user_metadata?.name) || null;
        const avatar = (user.user_metadata?.picture) || (user.user_metadata?.avatar_url) || null;

        // Upsert minimal profile fields (only non-null values)
        const upsertPayload: any = {
          id: user.id,
          email: user.email,
          updated_at: new Date().toISOString()
        };
        if (fullName) {
          upsertPayload.display_name = fullName;
          upsertPayload.full_name = fullName;
        }
        if (avatar) {
          upsertPayload.avatar_url = avatar;
        }
        await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id' });

        // If avatar is external, mirror it into Supabase Storage for reliability
        try {
          if (avatar && avatar.startsWith('http') && !avatar.includes('/storage/v1/object/public/avatars/')) {
            const res = await fetch(avatar);
            if (res.ok) {
              const blob = await res.blob();
              const mime = res.headers.get('content-type') || blob.type || 'image/jpeg';
              const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg';
              const path = `${user.id}/provider_${Date.now()}.${ext}`;
              const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { contentType: mime, upsert: true });
              if (!upErr) {
                const { data: pub } = await supabase.storage.from('avatars').getPublicUrl(path);
                if (pub?.publicUrl) {
                  await supabase.from('profiles').update({ avatar_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Avatar mirroring skipped:', e);
        }

        // Successful authentication
        toast({
          title: "Success",
          description: "Successfully signed in"
        });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error("Authentication callback error:", error);
        
        // Clear any stale auth data
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Please try signing in again"
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;

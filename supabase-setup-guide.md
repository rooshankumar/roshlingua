
# Comprehensive Supabase Setup Guide

This guide covers everything you need to set up Supabase with your React application, including authentication with Google OAuth, handling redirections, and structuring your API routes and data access.

## 1. Initial Supabase Configuration

### Project Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project" and fill in the details
3. Note your project URL and anon key for later use

### Environment Variables

Create a `.env` file in your project root:

```
VITE_SUPABASE_URL=https://yekzyvdjjozhhatdefsq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlla3p5dmRqam96aGhhdGRlZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDk5NjEsImV4cCI6MjA1ODI4NTk2MX0.6z2QW9PnENnT9knd9oK8Sbqf2JhN1NsKIKs6hG4vM8Q
```

## 2. Setting Up Google OAuth (Fixing Redirection Issues)

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Set up your OAuth consent screen if prompted
6. For Application Type, select "Web application"

### Critical Redirect URLs Configuration

#### In Google Cloud Console:

For "Authorized JavaScript origins", add:
- Your development URL (e.g., `http://localhost:5173`)
- Your production URL if available (e.g., `https://yourdomain.com`)
- Your Lovable preview URL (e.g., `https://1c74e0a4-9a9b-47fd-b3ce-da24a2804e2f.lovableproject.com`)

For "Authorized redirect URIs", add:
- `https://yekzyvdjjozhhatdefsq.supabase.co/auth/v1/callback`
- `http://localhost:5173/auth/callback`
- `https://1c74e0a4-9a9b-47fd-b3ce-da24a2804e2f.lovableproject.com/auth/callback`
- `https://yourdomain.com/auth/callback` (if applicable)

#### In Supabase Dashboard:

1. Go to Authentication > Providers
2. Find Google and click "Edit"
3. Enter your Google Client ID and Secret
4. Save changes

#### In Supabase URL Configuration:

1. Go to Authentication > URL Configuration
2. Set Site URL to your application's base URL (e.g., `https://1c74e0a4-9a9b-47fd-b3ce-da24a2804e2f.lovableproject.com`)
3. Add Redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `https://1c74e0a4-9a9b-47fd-b3ce-da24a2804e2f.lovableproject.com/auth/callback`
   - `https://yourdomain.com/auth/callback` (if applicable)

## 3. Backend Database Setup

### Schema Setup

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table is already managed by Supabase Auth

-- Set up profiles table (if not already exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT
);

-- Create trigger to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read any profile
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

## 4. Frontend Auth Implementation

### Supabase Client Setup

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Function to get current user
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

// Google OAuth sign-in
export const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};

// Sign out
export const signOut = async () => {
  return await supabase.auth.signOut();
};
```

### Auth Provider Implementation

Create an improved AuthProvider.tsx:

```typescript
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };
  
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Auth Callback Handler

Create `src/pages/AuthCallback.tsx`:

```typescript
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Process the OAuth callback
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        // Session will be automatically set by the Supabase client
        setIsLoading(false);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

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

  // Redirect to dashboard on success
  return <Navigate to="/dashboard" replace />;
};

export default AuthCallback;
```

## 5. Routing Implementation

Update your App.tsx with proper routing:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={
        user ? <Navigate to="/dashboard" replace /> : <Auth />
      } />
      
      {/* Auth callback route for OAuth */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      {/* Catch all for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <Toaster />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
```

## 6. Protected Route Component

Create `src/components/auth/ProtectedRoute.tsx`:

```typescript
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    );
  }
  
  // If user is not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If authentication requirements are satisfied, render children
  return <>{children}</>;
};

export default ProtectedRoute;
```

## 7. Data Operations with Supabase

Create a hooks directory for data fetching:

```typescript
// src/hooks/useProfiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: { username?: string; bio?: string; avatar_url?: string; }
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
};
```

## 8. Troubleshooting Common Issues

### Redirection Issues

If you're experiencing redirection issues:

1. **Check Network Tab**: Look for any 404 or 500 errors in your browser's developer tools
2. **Check URL Parameters**: Ensure no parameters are being dropped during redirection
3. **Clear Browser Cache**: OAuth tokens might be stored incorrectly
4. **Check Console for CORS Errors**: Ensure your domain is properly whitelisted
5. **Verify Environment Variables**: Ensure they match your Supabase project

### Authentication Errors

Common authentication errors and solutions:

1. **"Invalid redirect_uri"**: 
   - Double-check the redirect URLs in both Google Cloud Console and Supabase
   - Ensure they match exactly, including trailing slashes

2. **"Authentication failed"**:
   - Check if your Google OAuth credentials are correct
   - Verify the OAuth provider is enabled in Supabase

3. **"Access token has expired"**:
   - This usually means token refresh is not working
   - Ensure `autoRefreshToken: true` is set in the Supabase client config

## 9. Best Practices for Supabase Implementation

1. **Use Row Level Security (RLS)**: Always implement RLS policies for your tables
2. **Keep Authentication Logic Centralized**: Use the AuthProvider pattern
3. **Handle Loading States**: Always show loading indicators during authentication checks
4. **Use React Query for Data Fetching**: Provides caching, refetching, and optimistic updates
5. **Implement Error Handling**: Especially for authentication and data operations
6. **Use TypeScript with Supabase**: Generate and use types for your database schema

## 10. Next Steps

1. **Implement User Profiles**: Allow users to customize their profiles
2. **Add Real-Time Features**: Use Supabase's real-time subscriptions
3. **Implement File Storage**: Use Supabase Storage for file uploads
4. **Add Edge Functions**: For server-side logic (if needed)
5. **Set Up CI/CD**: For automated deployments
6. **Monitor Performance**: Set up analytics to track app performance

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React Router Documentation](https://reactrouter.com/en/main)

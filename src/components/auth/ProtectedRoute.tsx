
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isOnboardingComplete?: boolean;
  requiresOnboarding?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  isAuthenticated, 
  isOnboardingComplete = true,
  requiresOnboarding = true
}: ProtectedRouteProps) => {
  // If user is not authenticated, redirect to auth page
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  // If the route requires completed onboarding and onboarding is not complete,
  // redirect to onboarding page
  if (requiresOnboarding && !isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // If authentication and onboarding requirements are satisfied, render children
  return <>{children}</>;
};

export default ProtectedRoute;

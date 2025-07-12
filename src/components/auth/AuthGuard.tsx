// src/components/auth/AuthGuard.tsx
import { ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
// MODIFICATION: Import the new useAuth hook and remove unused imports
import { useAuth } from "@/context/AuthContext";

interface AuthGuardProps {
  children?: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // MODIFICATION: State is now consumed from the global context
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // This spinner will only show on the very first load of the application
  // REMOVED: Full-page loading spinner. The page content will now load instantly.
  // if (isLoading) {
  //   return (
  //     <div className="flex justify-center items-center min-h-screen">
  //       <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // Once loading is complete, redirect if not authenticated
  if (!isAuthenticated && !isLoading) { // Ensure isLoading is false to prevent redirect loops on initial check
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If authenticated (or still loading but not yet determined as unauthenticated), render the page content instantly
  // The 'isLoading' check is removed here, so the page content attempts to render immediately.
  // Individual components within the page should handle their own loading states.
  return children ? <>{children}</> : <Outlet />;
}
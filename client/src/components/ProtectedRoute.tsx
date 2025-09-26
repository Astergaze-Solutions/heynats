import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useConnectionStatus } from '../hooks/useNATS';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: status, isLoading } = useConnectionStatus();

  // Show loading state while checking connection
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not connected
  if (!status?.connected) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
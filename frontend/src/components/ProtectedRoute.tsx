import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && (!profile || !roles.includes(profile.role))) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">You don't have access to this page</h1>
        <p className="mt-2 text-gray-600">This area is restricted to: {roles.join(', ')}.</p>
      </div>
    );
  }
  return <>{children}</>;
}

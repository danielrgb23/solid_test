import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth_context';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { session } = useAuth();

  if (session.isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/auth.service.js';

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

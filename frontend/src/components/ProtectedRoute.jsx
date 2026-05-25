import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Skeleton from "./ui/Skeleton";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8"><Skeleton className="h-40" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

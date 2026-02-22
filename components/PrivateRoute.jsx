import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div className="p-4 text-center">Checking login...</div>;
  }

  return user ? children : <Navigate to="/registration" replace />;
}

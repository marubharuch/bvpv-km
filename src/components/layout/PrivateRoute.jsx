import { Navigate } from "react-router-dom";
import { useAuth }  from "../../store/AuthContext";
import Spinner      from "../ui/Spinner";

export default function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner message="Loading..." />;
  if (!user)  return <Navigate to="/login" replace />;
  return children;
}

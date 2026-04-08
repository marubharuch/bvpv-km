import { Navigate } from "react-router-dom";
import { useAuth }  from "../../store/AuthContext";
import Spinner      from "../ui/Spinner";

export default function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner message="Loading..." />;

  if (!user) return <Navigate to="/tree" replace />;

  // Anonymous user → /tree પર redirect (full login નથી)
  if (user.isAnonymous) return <Navigate to="/tree" replace />;

  return children;
}

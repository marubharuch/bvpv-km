import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

export default function PrivateRoute({ children }) {
  const user = getAuth().currentUser;
  return user ? children : <Navigate to="/registration" />;
}

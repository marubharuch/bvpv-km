// App.jsx — All routes defined here. One place, easy to scan.
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth }   from "./store/AuthContext";
import AppLayout          from "./components/layout/AppLayout";
import PrivateRoute       from "./components/layout/PrivateRoute";
import Spinner            from "./components/ui/Spinner";

// Pages
import Home                   from "./pages/Home";
import About                  from "./pages/About";
import Contact                from "./pages/Contact";
import LoginPage               from "./pages/LoginPage";
import ForgotPasswordPage      from "./pages/ForgotPasswordPage";
import OnboardingPage          from "./pages/OnboardingPage";
import FamilyRegistrationFlow  from "./pages/FamilyRegistrationFlow";
import RegistrationSuccess     from "./pages/RegistrationSuccess";
import DashboardPage           from "./pages/DashboardPage";
import ProfilePage             from "./pages/ProfilePage";
import StudentsPage            from "./pages/StudentsPage";
import ConnectorsPage          from "./pages/ConnectorsPage";
import LeaderboardPage         from "./pages/LeaderboardPage";
import RegisterList            from "./pages/RegisterList";
import JoinFamilyPage          from "./pages/JoinFamilyPage";

function AppRoutes() {
  const { ready } = useAuth();
  if (!ready) return <Spinner message="Loading…" />;

  return (
    <Routes>
      {/* Public shell */}
      
      <Route element={<AppLayout />}>
        <Route path="/"           element={<Home />} />
        <Route path="/about"      element={<About />} />
        <Route path="/contact"    element={<Contact />} />
        <Route path="/connectors" element={<ConnectorsPage />} />
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/forgot"     element={<ForgotPasswordPage />} />
        <Route path="/join"       element={<JoinFamilyPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/register-list" element={<RegisterList />} />

        {/* Auth-required */}
        <Route path="/onboarding"    element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
        <Route path="/registration"  element={<PrivateRoute><FamilyRegistrationFlow /></PrivateRoute>} />
        <Route path="/registration-success" element={<PrivateRoute><RegistrationSuccess /></PrivateRoute>} />
        <Route path="/dashboard"     element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/profile"       element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/students"      element={<PrivateRoute><StudentsPage /></PrivateRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

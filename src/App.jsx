import { Routes, Route, useNavigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import PrivateRoute from "./components/PrivateRoute";

import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Registration from "./pages/FamilyRegistrationFlow";
import Dashboard from "./pages/DashboardPage";
import Students from "./pages/StudentsPage";
import Profile from "./pages/ProfilePage";
import JoinFamilyPage from "./pages/JoinFamilyPage";
import LoginPage from "./pages/LoginPage";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ConnectorsPage from "./pages/ConnectorsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import RegisterList from "./pages/RegisterList";
import OnboardingPage from "./pages/OnboardingPage"

// ✅ DELETED: UniversalOnboardingPage, ContactOnboardingPage

function RegistrationWithNav() {
  const navigate = useNavigate();
  return <Registration onDone={() => navigate("/dashboard", { replace: true })} />;
}

export default function App() {
  return (
    <Routes>

      {/* ⭐ Layout Route */}
      <Route element={<AppLayout />}>

        {/* Public */}
        <Route path="/"               element={<Home />} />
        <Route path="/about"          element={<About />} />
        <Route path="/contact"        element={<Contact />} />
        <Route path="/registration"   element={<RegistrationWithNav />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/connectors"     element={<ConnectorsPage />} />
        <Route path="/leaderboard"    element={<LeaderboardPage />} />
        <Route path="/join"           element={<JoinFamilyPage />} />
        <Route path="/success"        element={<RegistrationSuccess />} />
        <Route path="/register-list"  element={<RegisterList />} />

        {/* ✅ NEW unified onboarding — replaces /onboarding and /contact-onboarding */}
        <Route path="/onboarding"     element={<OnboardingPage />} />

        {/* Private */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/students"  element={<PrivateRoute><Students /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />

      </Route>

    </Routes>
  );
}
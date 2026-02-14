import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import PrivateRoute from "./components/PrivateRoute";

import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Registration from "./pages/StudentFormPage";
import Dashboard from "./pages/DashboardPage";
import Students from "./pages/StudentsPage";
import Profile from "./pages/ProfilePage";
import JoinFamilyPage from "./pages/JoinFamilyPage";
import LoginPage from "./pages/LoginPage";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

export default function App() {
  return (
    <Routes>

      {/* ⭐ Layout Route */}
      <Route element={<AppLayout />}>

        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Private */}
        <Route
          path="/dashboard"
          element={<PrivateRoute><Dashboard /></PrivateRoute>}
        />

        <Route path="/success" element={<RegistrationSuccess />} />
        <Route path="/join" element={<JoinFamilyPage />} />

        <Route
          path="/students"
          element={<PrivateRoute><Students /></PrivateRoute>}
        />

        <Route
          path="/profile"
          element={<PrivateRoute><Profile /></PrivateRoute>}
        />

      </Route>

    </Routes>
  );
}

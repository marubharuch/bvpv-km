import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Registration from "./pages/StudentFormPage";
import Dashboard from "./pages/DashboardPage";
import Students from "./pages/StudentsPage";
import Profile from "./pages/ProfilePage";
import JoinFamilyPage from "./pages/JoinFamilyPage";
import LoginPage from "./pages/LoginPage";

<Route path="/login" element={<LoginPage />} />


import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Private */}
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/join" element={<JoinFamilyPage />} />
        <Route path="/students" element={
          <PrivateRoute><Students /></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><Profile /></PrivateRoute>
        } />
      </Routes>
    </div>
  );
}

// App.jsx — All routes defined here. One place, easy to scan.
//
// ── Routing Logic ────────────────────────────────────────────────────────────
//  /              → Home (public — login વગર)
//  /join?token=   → JoinPage — Mobile + PIN screen (WhatsApp invite link)
//  /tree          → TreeWrapper — Anonymous/logged-in user ને table view
//  /tree/:treeId  → TreeGuestPage — specific tree (invite link)
//  /login         → LoginPage (full login)
//  બધા private    → login નથી? → /tree redirect  |  anonymous? → /tree redirect
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense }          from "react";
import { AuthProvider, useAuth }   from "./store/AuthContext";
import AppLayout                   from "./components/layout/AppLayout";
import PrivateRoute                from "./components/layout/PrivateRoute";
import Spinner                     from "./components/ui/Spinner";

// Public pages — loaded eagerly (small, always needed)
import Home           from "./pages/Home";
import About          from "./pages/About";
import Contact        from "./pages/Contact";
import AdminDeleteUser from "./pages/AdminDeleteUser"; // hidden — admin use only
import AdminTreePage   from "./pages/AdminTreePage";   // hidden — admin use only

// All other pages — lazy loaded
const LoginPage              = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage     = lazy(() => import("./pages/ForgotPasswordPage"));
const LeaderboardPage        = lazy(() => import("./pages/LeaderboardPage"));
const RegisterList           = lazy(() => import("./pages/RegisterList"));
const ConnectorsPage         = lazy(() => import("./pages/ConnectorsPage"));
const OnboardingPage         = lazy(() => import("./pages/OnboardingPage"));
const JoinPage               = lazy(() => import("./pages/JoinPage"));        // ← NEW: WhatsApp invite

const RegistrationSuccess    = lazy(() => import("./pages/RegistrationSuccess"));
const DashboardPage          = lazy(() => import("./pages/DashboardPage/index"));
const ProfilePage            = lazy(() => import("./pages/ProfilePage"));
const StudentsPage           = lazy(() => import("./pages/StudentsPage"));
const TreeWrapper             = lazy(() => import("./pages/FamilyTree/TreeWrapper"));
const TreeGuestPage           = lazy(() => import("./pages/Tree"));
const GamesHome    = lazy(() => import("./pages/Games/index"));
const TambolaGame  = lazy(() => import("./pages/Games/Tambola/index"));
const QuizGame     = lazy(() => import("./pages/Games/Quiz/index"));


function AppRoutes() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner message="Loading…" />;

  return (
    <Suspense fallback={<Spinner message="Loading…" />}>
      <Routes>

        {/* ── With AppLayout (top navbar + bottom navbar) ── */}
        <Route element={<AppLayout />}>

          {/* Public */}
          <Route path="/"              element={<Home />} />
          <Route path="/about"         element={<About />} />
          <Route path="/contact"       element={<Contact />} />
          <Route path="/connectors"    element={<ConnectorsPage />} />
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/forgot"        element={<ForgotPasswordPage />} />
          <Route path="/leaderboard"   element={<LeaderboardPage />} />
          <Route path="/register-list" element={<RegisterList />} />

          {/* Auth-required */}
          <Route path="/onboarding"           element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
          <Route path="/registration-success" element={<PrivateRoute><RegistrationSuccess /></PrivateRoute>} />
          <Route path="/dashboard"            element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/profile"              element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/students"             element={<PrivateRoute><StudentsPage /></PrivateRoute>} />

          <Route path="/games"                  element={<PrivateRoute><GamesHome /></PrivateRoute>} />
          <Route path="/games/tambola/:gameId"  element={<PrivateRoute><TambolaGame /></PrivateRoute>} />
          <Route path="/games/quiz/:gameId"     element={<PrivateRoute><QuizGame /></PrivateRoute>} />

          {/* Hidden admin pages */}
          <Route path="/admin-delete" element={<AdminDeleteUser />} />
          <Route path="/inv_tree"     element={<AdminTreePage />} />

        </Route>

        {/* ── Without AppLayout (full screen — no navbar) ── */}

        {/* /join?token=TREEID_PIN — WhatsApp invite link → Mobile+PIN screen */}
        <Route path="/join" element={<JoinPage />} />

        {/* /tree — Anonymous અથવા logged-in user → TreeWrapper (table view) */}
        {/* Login નહીં? → /tree (public access with PIN)                       */}
        {/* Anonymous login? → /tree (same)                                    */}
        {/* Proper login + familyId? → TreeWrapper full access                 */}
        <Route
          path="/tree"
          element={
            !user
              ? <TreeWrapper />                        // not logged in — show tree with PIN
              : user.isAnonymous
                ? <TreeWrapper />                      // anonymous — show tree
                : <PrivateRoute><TreeWrapper /></PrivateRoute>  // full user — private
          }
        />

        {/* /tree/:treeId — specific tree via invite link */}
        <Route path="/tree/:treeId" element={<TreeGuestPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

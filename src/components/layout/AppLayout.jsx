import { useState, useEffect } from "react";
import { Outlet }      from "react-router-dom";
import BottomNavbar    from "./BottomNavbar";
import OnboardingTour  from "./OnboardingTour";           // ← તમારા components folder માં
import { NAVBAR_TOUR_STEPS }  from "../../constants/tourSteps";
import { APP_NAME, APP_TAGLINE, COLORS } from "../../constants/app";

export default function AppLayout() {

  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("appTourDone");
    if (!seen) setTourActive(true);
  }, []);

  const handleFinish = () => {
    localStorage.setItem("appTourDone", "true");
    setTourActive(false);
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      <header className="sticky top-0 z-40"
        style={{ background: "linear-gradient(135deg,#5A1020,#7B1C2E)", borderBottom: "1px solid rgba(201,168,76,0.4)", boxShadow: "0 2px 12px rgba(90,16,32,0.3)" }}>
        <div className="h-0.5 w-full" style={{ background: COLORS.gold }} />
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 border-2"
            style={{ background: "rgba(201,168,76,0.2)", borderColor: "rgba(201,168,76,0.6)" }}>🙏</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight" style={{ color: COLORS.goldLight }}>{APP_NAME}</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(240,208,128,0.65)" }}>{APP_TAGLINE}</p>
          </div>
        </div>
      </header>

      <main className="pb-20"><Outlet /></main>

      <BottomNavbar />

      {/* Onboarding Tour — app પહેલી વાર open થાય ત્યારે જ */}
      {tourActive && (
        <OnboardingTour
          steps={NAVBAR_TOUR_STEPS}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
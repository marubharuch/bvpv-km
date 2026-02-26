import { Outlet } from "react-router-dom";
import BottomNavbar from "../components/BottomNavbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: "#FDF6EC" }}>

      {/* ── TOP HEADER ── */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "linear-gradient(135deg, #5A1020 0%, #7B1C2E 100%)",
          borderBottom: "1px solid rgba(201,168,76,0.4)",
          boxShadow: "0 2px 12px rgba(90,16,32,0.3)",
        }}
      >
        {/* Gold top line */}
        <div className="h-0.5 w-full" style={{ background: "#C9A84C" }} />

        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-3">

          {/* 🙏 Logo — decorative emblem instead of letter */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 border-2"
            style={{
              background: "rgba(201,168,76,0.2)",
              borderColor: "rgba(201,168,76,0.6)",
            }}
          >
            🙏
          </div>

          {/* App Name */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight" style={{ color: "#F0D080" }}>
              વિશા ઓશવાળ જૈન કેળવણી મંડળ
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(240,208,128,0.65)" }}>
              બોરસદ – વાલવોડ – પાદરા – વટાદરા
            </p>
          </div>

        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* ── BOTTOM NAVBAR ── */}
      <BottomNavbar />

    </div>
  );
}
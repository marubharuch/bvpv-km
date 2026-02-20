import { Outlet } from "react-router-dom";
import BottomNavbar from "../components/BottomNavbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
<div className="bg-white shadow-sm sticky top-0 z-40">
  <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-3">

    {/* Fake Logo */}
    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
      V
    </div>

    {/* App Name */}
    <div>
      <h1 className="text-sm font-bold text-gray-900">
        વિશા ઓશવાળ જૈન કેળવણી મંડળ
      </h1>
      <p className="text-xs text-gray-500">
        બોરસદ – વાલવોડ – પાદરા – વટાદરા
      </p>
    </div>

  </div>
</div>





      {/* Page Content */}
      <main className="pb-20">
            
        <Outlet />
      </main>

      {/* Bottom Navbar */}
      <BottomNavbar />

    </div>
  );
}

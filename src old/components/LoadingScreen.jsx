// components/LoadingScreen.jsx
import { useEffect, useState } from "react";

export default function LoadingScreen({ 
  message = "Saving your data...", 
  subMessage = "Please don't close this window",
  progress = null,
  showLogo = true 
}) {
  const [dots, setDots] = useState("");
  
  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center">
          
          {showLogo && (
            <div className="mb-6">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-16 w-auto opacity-75"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}
          
          {/* Spinner */}
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          
          {/* Main Message */}
          <h3 className="mt-6 text-xl font-semibold text-gray-800">
            {message}{dots}
          </h3>
          
          {/* Sub Message */}
          <p className="mt-2 text-sm text-gray-600">
            {subMessage}
          </p>
          
          {/* Progress Bar (Optional) */}
          {progress !== null && (
            <div className="mt-6 w-full">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Warning Message for Slow Connection */}
          <p className="mt-6 text-xs text-gray-500 border-t pt-4 w-full text-center">
            ⚡ This may take a few seconds depending on your internet speed
          </p>
          
        </div>
      </div>
    </div>
  );
}

// src/components/ui/LoadingOverlay.jsx
export default function LoadingOverlay({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      <p className="text-white mt-4 text-lg">{message}</p>
    </div>
  );
}

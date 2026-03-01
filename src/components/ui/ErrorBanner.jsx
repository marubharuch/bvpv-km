// src/components/ui/ErrorBanner.jsx
export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
      ⚠️ {message}
    </div>
  );
}

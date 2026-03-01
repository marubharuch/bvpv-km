// src/components/ui/ProgressBar.jsx
export default function ProgressBar({ pct = 0, className = "" }) {
  return (
    <div className={`h-1 bg-gray-100 overflow-hidden ${className}`}>
      <div
        className="h-full bg-green-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

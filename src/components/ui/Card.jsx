// src/components/ui/Card.jsx
export default function Card({ children, className = "" }) {
  return (
    <div
      className={`min-h-screen flex items-start justify-center pt-8 px-4 ${className}`}
      style={{ background: "#FDF6EC" }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(90,16,32,0.15)" }}
      >
        <div className="h-1 w-full" style={{ background: "#C9A84C" }} />
        <div className="bg-white p-6 space-y-5">{children}</div>
      </div>
    </div>
  );
}

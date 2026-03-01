// src/components/ui/Spinner.jsx
export default function Spinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen" style={{ background: "#FDF6EC" }}>
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: "#7B1C2E", borderTopColor: "transparent" }} />
      <p className="text-sm" style={{ color: "#7B1C2E" }}>{message}</p>
    </div>
  );
}

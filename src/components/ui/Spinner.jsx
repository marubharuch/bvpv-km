import { COLORS } from "../../constants/app";
export default function Spinner({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: COLORS.bg }}>
      <div className="w-12 h-12 rounded-full border-4 animate-spin"
        style={{ borderColor: COLORS.primary, borderTopColor: "transparent" }} />
      <p className="text-sm font-semibold" style={{ color: COLORS.primary }}>{message}</p>
    </div>
  );
}

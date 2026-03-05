import { COLORS } from "../../constants/app";
export default function LoadingOverlay({ message = "Please wait..." }) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3"
      style={{ background: "rgba(90,16,32,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-12 h-12 rounded-full border-4 animate-spin"
        style={{ borderColor: COLORS.goldLight, borderTopColor: "transparent" }} />
      <p className="text-sm font-bold" style={{ color: COLORS.goldLight }}>{message}</p>
    </div>
  );
}

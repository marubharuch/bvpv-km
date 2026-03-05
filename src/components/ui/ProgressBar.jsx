import { COLORS } from "../../constants/app";
export default function ProgressBar({ pct = 0 }) {
  return (
    <div className="h-1 w-full" style={{ background: COLORS.border }}>
      <div className="h-full transition-all duration-500"
        style={{ width: `${pct}%`, background: COLORS.gold }} />
    </div>
  );
}

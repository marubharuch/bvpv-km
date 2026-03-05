import { COLORS } from "../../constants/app";
export default function Card({ children, className = "" }) {
  return (
    <div className={`max-w-md mx-auto w-full p-5 space-y-4 rounded-2xl shadow-lg ${className}`}
      style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      {children}
    </div>
  );
}

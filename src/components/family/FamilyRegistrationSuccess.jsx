import { useNavigate }  from "react-router-dom";
import { COLORS }       from "../../constants/app";

export function FamilyRegistrationSuccess({ city, familyPin, memberCount = 0 }) {
  const navigate = useNavigate();
  return (
    <div className="p-6 text-center space-y-5">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: COLORS.textPrimary }}>Family Registered!</h2>
        <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>{city} Family · {memberCount} member{memberCount !== 1 ? "s" : ""}</p>
      </div>
      <div className="rounded-2xl p-5 space-y-1" style={{ background: COLORS.goldFaint, border: `1px solid ${COLORS.gold}` }}>
        <p className="text-xs font-semibold" style={{ color: COLORS.textSecondary }}>Family PIN</p>
        <p className="text-4xl font-black tracking-widest" style={{ color: COLORS.primary }}>{familyPin}</p>
        <p className="text-xs" style={{ color: COLORS.textSecondary }}>Share this PIN with family members to join</p>
      </div>
      <button onClick={() => navigate("/dashboard", { replace: true })}
        className="w-full py-4 rounded-2xl text-base font-bold text-white"
        style={{ background: COLORS.primary }}>
        Go to Dashboard →
      </button>
    </div>
  );
}

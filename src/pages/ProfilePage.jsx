// pages/ProfilePage.jsx
import { useEffect, useState } from "react";
import { getAuth, signOut }    from "firebase/auth";
import { useNavigate }         from "react-router-dom";
import { getFamilyWithMembers, updateFamilyPin, generatePin } from "../db/familyDb";
import { rtdb }                from "../db/rtdb";
import { cache }               from "../lib/cache";
import { COLORS }              from "../constants/app";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [famId,  setFamId]  = useState(null);
  const [members,setMembers]= useState([]);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    (async () => {
      const u = getAuth().currentUser;
      if (!u) { setLoading(false); return; }
      const fid = await rtdb.get(`users/${u.uid}/familyId`);
      if (!fid) { setLoading(false); return; }
      setFamId(fid);
      const result = await getFamilyWithMembers(fid);
      if (result) { const { members: ml, ...fam } = result; setFamily(fam); setMembers(Array.isArray(ml) ? ml : []); }
      setLoading(false);
    })();
  }, []);

  const regenPin = async () => {
    try {
      const newPin = await generatePin();
      await updateFamilyPin(famId, newPin, String(family.familyPin));
      setFamily(f => ({ ...f, familyPin: newPin }));
      await cache.remove(`dash:family:${getAuth().currentUser?.uid}`);
      alert("PIN updated!");
    } catch { alert("Failed to update PIN."); }
  };

  const logout = async () => {
    await cache.clear();
    await signOut(getAuth());
    navigate("/");
  };

  if (loading) return <p className="p-4 text-sm" style={{ color: COLORS.textSecondary }}>Loading...</p>;
  if (!family) return <p className="p-4 text-sm" style={{ color: COLORS.textSecondary }}>No family found.</p>;

  const inviteUrl = `${window.location.origin}/join?familyId=${famId}`;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24">

      <div className="rounded-2xl p-4 space-y-2" style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-base font-bold" style={{ color: COLORS.primaryDark }}>Family Profile</h2>
        {[
          { label: "City",    value: family.city    || "—" },
          { label: "Members", value: members.length },
          { label: "PIN",     value: family.familyPin },
        ].map(r => (
          <div key={r.label} className="flex justify-between py-1.5 border-b last:border-0" style={{ borderColor: COLORS.border }}>
            <span className="text-sm" style={{ color: COLORS.textSecondary }}>{r.label}</span>
            <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{r.value}</span>
          </div>
        ))}
        <button onClick={regenPin} className="text-xs mt-1" style={{ color: COLORS.primary }}>Regenerate PIN</button>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>
        <h3 className="text-sm font-bold" style={{ color: COLORS.primaryDark }}>Invite Members</h3>
        <input readOnly value={inviteUrl}
          className="w-full border rounded-xl px-3 py-2 text-xs" style={{ borderColor: COLORS.border, color: COLORS.textSecondary }} />
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => alert("Copied!"))}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: COLORS.primary }}>
            Copy Link
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Join our family app.\nLink: ${inviteUrl}\nPIN: ${family.familyPin}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white text-center flex items-center justify-center"
            style={{ background: "#25d366" }}>
            WhatsApp
          </a>
        </div>
      </div>

      <button onClick={logout}
        className="w-full py-3 rounded-xl text-sm font-semibold border-2"
        style={{ borderColor: "#fca5a5", color: COLORS.error }}>
        Sign Out
      </button>
    </div>
  );
}

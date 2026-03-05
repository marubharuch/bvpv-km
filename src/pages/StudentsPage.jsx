import { useEffect, useState }  from "react";
import { getAuth }              from "firebase/auth";
import { useNavigate }          from "react-router-dom";
import { rtdb }                 from "../db/rtdb";
import { COLORS }               from "../constants/app";

export default function StudentsPage() {
  const navigate       = useNavigate();
  const [students,    setStudents]    = useState([]);
  const [familyId,    setFamilyId]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const u = getAuth().currentUser;
      if (!u) return;
      const fid = await rtdb.get(`users/${u.uid}/familyId`);
      if (!fid) { setLoading(false); return; }
      setFamilyId(fid);
      const mids  = await rtdb.get(`families/${fid}/members`);
      if (!mids)  { setLoading(false); return; }
      const all   = await Promise.all(Object.keys(mids).map(id => rtdb.get(`members/${id}`).then(v => v ? { id, ...v } : null)));
      setStudents(all.filter(m => m?.isStudent));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="p-4 text-sm" style={{ color: COLORS.textSecondary }}>Loading...</p>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-3 pb-24">
      <h2 className="text-lg font-bold" style={{ color: COLORS.primaryDark }}>Students</h2>
      {students.length === 0 && (
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>No students found.</p>
      )}
      {students.map(s => (
        <div key={s.id} className="bg-white p-4 rounded-xl border" style={{ borderColor: COLORS.border }}>
          <p className="font-semibold text-sm" style={{ color: COLORS.primaryDark }}>{s.name}</p>
          <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>{s.educationType}</p>
          <p className="text-xs" style={{ color: COLORS.textSecondary }}>{s.standard || s.year || s.degree}</p>
        </div>
      ))}
    </div>
  );
}

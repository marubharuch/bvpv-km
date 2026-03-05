import { useState }            from "react";
import { ContactCard }         from "./ContactCard";
import { useContactPicker }    from "../../hooks/useContactPicker";
import MobileInput             from "../ui/MobileInput";
import { COLORS }              from "../../constants/app";

export function ContactCollector({ city, contacts, onAdd, onAddMany, onUpdate, onRemove, onConfirm, onBack }) {
  const [showForm, setShowForm] = useState(contacts.length === 0);
  const [name,    setName]      = useState("");
  const [phone,   setPhone]     = useState("");
  const [cc,      setCc]        = useState("+91");
  const [err,     setErr]       = useState("");
  const { pick, picking, isSupported } = useContactPicker();

  const allFilled = contacts.length > 0 && contacts.every(c => (c.name||"").trim() && (c.phone||"").trim());

  const handlePick = async () => {
    const picked = await pick();
    if (picked.length) { onAddMany(picked); setShowForm(false); }
  };

  const submit = () => {
    if (!name.trim())  { setErr("Enter a name."); return; }
    if (!phone.trim()) { setErr("Enter a mobile number."); return; }
    onAdd(name, phone, cc);
    setName(""); setPhone(""); setCc("+91"); setErr(""); setShowForm(false);
  };

  return (
    <div className="p-5 pb-8 flex flex-col gap-4">
      <div>
        <button onClick={onBack} className="text-xs font-bold mb-3" style={{ color: COLORS.textMuted }}>← Back</button>
        <span className="inline-block text-xs font-bold tracking-widest px-3 py-1 rounded-full mb-2"
          style={{ background: `${COLORS.primary}12`, color: COLORS.primary }}>Step 2 of 3</span>
        <h2 className="text-2xl font-extrabold" style={{ color: COLORS.textPrimary }}>Family Contacts</h2>
        <p className="text-sm mt-0.5" style={{ color: COLORS.textSecondary }}>
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} — fill name & mobile
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {contacts.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 rounded-2xl border-2 border-dashed"
            style={{ borderColor: COLORS.border, color: COLORS.textMuted }}>
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
            <p className="text-sm font-medium">No contacts yet</p>
          </div>
        )}
        {contacts.map((c, i) => (
          <ContactCard key={c.id} contact={c} index={i}
            onUpdate={onUpdate} onRemove={onRemove}
            autoFocus={!c.name && i === contacts.length - 1} />
        ))}
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 space-y-3 border" style={{ background: "#f9f9f9", borderColor: COLORS.border }}>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.textMuted }}>Add Manually</p>
          {err && <p className="text-xs font-semibold" style={{ color: COLORS.error }}>{err}</p>}
          <input type="text" placeholder="Full name" value={name}
            onChange={e => setName(e.target.value)} autoFocus
            className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none"
            style={{ border: `1px solid ${COLORS.border}`, fontSize: 16 }} />
          <MobileInput countryCode={cc} onCountryCodeChange={setCc}
            number={phone} onNumberChange={setPhone} placeholder="Mobile number" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setErr(""); }}
              className="text-sm font-semibold px-3 py-1.5" style={{ color: COLORS.textMuted }}>Cancel</button>
            <button onClick={submit}
              className="text-sm font-bold px-4 py-1.5 rounded-lg"
              style={{ background: `${COLORS.primary}15`, color: COLORS.primary }}>Add</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {isSupported && (
          <button onClick={handlePick} disabled={picking}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-2xl border-2 disabled:opacity-50"
            style={{ borderColor: COLORS.border, color: COLORS.textPrimary, background: "#fff" }}>
            📱 {picking ? "Opening…" : "Pick from Phone"}
          </button>
        )}
        {!showForm && (
          <button onClick={() => { setShowForm(true); setErr(""); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold rounded-2xl border-2"
            style={{ borderColor: COLORS.border, color: COLORS.textPrimary, background: "#fff" }}>
            + Add Manual
          </button>
        )}
      </div>

      <button onClick={allFilled ? onConfirm : undefined} disabled={!allFilled}
        className="w-full py-4 rounded-2xl text-base font-extrabold transition-all"
        style={{
          background: allFilled ? "#22c55e" : "#f3f4f6",
          color:      allFilled ? "#fff"    : "#9ca3af",
          cursor:     allFilled ? "pointer" : "not-allowed",
        }}>
        {contacts.length === 0 ? "Add at least one contact" : `Confirm ${contacts.length} Contact${contacts.length > 1 ? "s" : ""} →`}
      </button>
    </div>
  );
}

import { useState } from "react";
import { ContactCard } from "./ContactCard";
import { useContactPicker } from "../../hooks/useContactPicker";


export function ContactCollector({ city, contacts, onAdd, onAddMany, onUpdate, onRemove, onConfirm, onBack }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [err, setErr]           = useState("");

  const { pick, picking, error: pickErr, isSupported } = useContactPicker();

  const allFilled   = contacts.length > 0 && contacts.every((c) => c.name.trim() && c.phone.trim());
  const confirmText = contacts.length === 0
    ? "Add at least one contact"
    : `Confirm ${contacts.length} Contact${contacts.length > 1 ? "s" : ""} →`;

  async function handlePick() {
    const picked = await pick();
    if (picked.length) onAddMany(picked);
  }

  function submit() {
    if (!name.trim()) { setErr("Enter a name."); return; }
    if (!phone.trim()) { setErr("Enter a mobile number."); return; }
    onAdd(name, phone);
    setName(""); setPhone(""); setErr(""); setShowForm(false);
  }

  function onKey(e) {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") { setShowForm(false); setErr(""); }
  }

  return (
    <div className="p-5 pb-8 flex flex-col gap-4">
      {/* Header */}
      <div>
        <button onClick={onBack} className="text-xs font-bold text-gray-400 hover:text-gray-700 transition mb-3">
          ← Back
        </button>
        <span className="inline-block text-xs font-bold tracking-widest text-green-700 bg-green-50 px-3 py-1 rounded-full mb-2 uppercase">
          Step 2 of 3
        </span>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-0.5">Family Contacts</h2>
        <p className="text-sm text-gray-500">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} — fill name &amp; mobile
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {contacts.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
            <p className="text-sm font-medium">No contacts yet</p>
          </div>
        )}
        {contacts.map((c, i) => (
          <ContactCard
            key={c.id}
            contact={c}
            index={i}
            onUpdate={onUpdate}
            onRemove={onRemove}
            autoFocus={!c.name && i === contacts.length - 1}
          />
        ))}
      </div>

      {/* Manual form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Add Manually</p>
          {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            className="w-full px-3 py-2.5 text-sm font-semibold bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition placeholder:text-gray-400 placeholder:font-normal"
          />
          <input
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={onKey}
            inputMode="tel"
            className="w-full px-3 py-2.5 text-sm font-semibold bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition placeholder:text-gray-400 placeholder:font-normal"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setErr(""); }}
              className="text-sm font-semibold text-gray-400 hover:text-gray-700 px-3 py-1.5 transition"
            >Cancel</button>
            <button
              onClick={submit}
              className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-1.5 rounded-lg transition"
            >Add</button>
          </div>
        </div>
      )}

      {pickErr && <p className="text-xs text-red-500 text-center">{pickErr}</p>}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isSupported && (
          <button
            onClick={handlePick}
            disabled={picking}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition disabled:opacity-50"
          >
            📱 {picking ? "Opening…" : "Pick from Phone"}
          </button>
        )}
        <button
          onClick={() => { setShowForm(true); setErr(""); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition"
        >
          + Add Manual
        </button>
      </div>

      {/* Confirm button */}
      <button
        onClick={allFilled ? onConfirm : undefined}
        disabled={!allFilled}
        className={`w-full py-4 rounded-2xl text-base font-extrabold tracking-wide transition ${
          allFilled
            ? "bg-green-500 hover:bg-green-600 text-white active:scale-[0.98]"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {confirmText}
      </button>
    </div>
  );
}

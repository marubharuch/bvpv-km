import { useState, useRef, useEffect } from "react";

export function ContactCard({ contact, index, onUpdate, onRemove, autoFocus }) {
  const [name, setName]   = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const nameRef           = useRef(null);

  useEffect(() => { if (autoFocus) setTimeout(() => nameRef.current?.focus(), 60); }, [autoFocus]);
  useEffect(() => { setName(contact.name); },  [contact.name]);
  useEffect(() => { setPhone(contact.phone); }, [contact.phone]);

  const commitName  = () => { const t = name.trim();  if (t !== contact.name)  onUpdate(contact.id, "name",  t); };
  const commitPhone = () => { const t = phone.trim(); if (t !== contact.phone) onUpdate(contact.id, "phone", t); };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 focus-within:border-green-400 focus-within:bg-white transition">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
          Contact {index + 1}
        </span>
        <button
          onClick={() => onRemove(contact.id)}
          className="text-xs font-bold text-red-500 border border-red-300 rounded-full px-3 py-0.5 hover:bg-red-50 transition"
        >
          Remove
        </button>
      </div>

      {/* Fields */}
      <div className="flex gap-2">
        <input
          ref={nameRef}
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          className="flex-[1.4] min-w-0 px-3 py-2.5 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 placeholder:font-normal"
        />
        <input
          type="tel"
          placeholder="Mobile"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={commitPhone}
          inputMode="tel"
          className="flex-1 min-w-0 px-3 py-2.5 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400 placeholder:font-normal"
        />
      </div>
    </div>
  );
}

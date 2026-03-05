import { useState, useRef, useEffect } from "react";
import MobileInput from "../ui/MobileInput";
import { COLORS }  from "../../constants/app";

export function ContactCard({ contact, index, onUpdate, onRemove, autoFocus }) {
  const [name, setName] = useState(contact.name  || "");
  const nameRef         = useRef(null);

  useEffect(() => { if (autoFocus) setTimeout(() => nameRef.current?.focus(), 60); }, [autoFocus]);
  useEffect(() => { setName(contact.name || ""); }, [contact.name]);

  const commitName = () => {
    const t = name.trim();
    if (t !== contact.name) onUpdate(contact.id, "name", t);
  };

  return (
    <div className="rounded-2xl p-3.5 border-2 transition-all"
      style={{ border: `2px solid ${COLORS.border}`, background: "#fafafa" }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: COLORS.textMuted }}>
          Contact {index + 1}
          {contact.isSelf && <span className="ml-2 normal-case font-semibold" style={{ color: "#3b82f6" }}>👤 You</span>}
        </span>
        <button onClick={() => onRemove(contact.id)}
          className="text-xs font-bold px-3 py-0.5 rounded-full border transition-colors"
          style={{ color: COLORS.error, borderColor: "#fca5a5" }}>Remove</button>
      </div>
      <input ref={nameRef} type="text" placeholder="Full Name" value={name}
        onChange={e => setName(e.target.value)} onBlur={commitName}
        className="w-full px-3 py-2.5 mb-2 text-sm font-semibold rounded-xl outline-none"
        style={{ border: `1px solid ${COLORS.border}`, fontSize: 16, color: COLORS.textPrimary, background: "#fff" }} />
      <MobileInput
        countryCode={contact.countryCode || "+91"}
        onCountryCodeChange={v => onUpdate(contact.id, "countryCode", v)}
        number={contact.phone || ""}
        onNumberChange={v => onUpdate(contact.id, "phone", v)}
        placeholder="Mobile number"
        maxLength={15}
      />
    </div>
  );
}

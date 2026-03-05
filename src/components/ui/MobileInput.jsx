import { COLORS } from "../../constants/app";

export default function MobileInput({
  countryCode, onCountryCodeChange,
  number, onNumberChange,
  placeholder = "Mobile number",
  maxLength = 10,
  error,
}) {
  return (
    <div>
      <div className="flex gap-2">
        <input type="tel" value={countryCode}
          onChange={e => {
            let v = e.target.value;
            if (!v.startsWith("+")) v = "+" + v.replace(/\+/g, "");
            onCountryCodeChange(v);
          }}
          maxLength={5} placeholder="+91"
          className="w-20 rounded-xl px-3 py-3 text-center outline-none"
          style={{ border: `2px solid ${COLORS.border}`, fontSize: 16, color: COLORS.textPrimary }} />
        <input type="tel" inputMode="numeric" placeholder={placeholder}
          value={number} onChange={e => onNumberChange(e.target.value.replace(/\D/g, ""))}
          maxLength={maxLength}
          className="flex-1 rounded-xl px-4 py-3 outline-none"
          style={{
            border: `2px solid ${error ? COLORS.error : COLORS.border}`,
            fontSize: 16, color: COLORS.textPrimary,
          }} />
      </div>
      {error && <p className="text-xs mt-1" style={{ color: COLORS.error }}>{error}</p>}
    </div>
  );
}

// src/components/ui/MobileInput.jsx
// Country code + number input pair, reused across login, onboarding, member form.

export default function MobileInput({
  countryCode,
  onCountryCodeChange,
  number,
  onNumberChange,
  placeholder = "Mobile number",
  maxLength = 10,
  error,
  style = {},
}) {
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="tel"
          value={countryCode}
          onChange={e => {
            let v = e.target.value;
            if (!v.startsWith("+")) v = "+" + v.replace(/\+/g, "");
            onCountryCodeChange(v);
          }}
          maxLength={5}
          className="w-20 rounded-xl px-3 py-3 text-center text-sm outline-none"
          style={{ border: "2px solid #f0e6e6", fontSize: 16, ...style }}
          placeholder="+91"
        />
        <input
          type="tel"
          inputMode="numeric"
          placeholder={placeholder}
          value={number}
          onChange={e => onNumberChange(e.target.value.replace(/\D/g, ""))}
          maxLength={maxLength}
          className="flex-1 rounded-xl px-4 py-3 outline-none"
          style={{ border: error ? "2px solid #ef4444" : "2px solid #f0e6e6", fontSize: 16, ...style }}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

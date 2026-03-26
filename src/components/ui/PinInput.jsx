import { useRef } from "react";
import { COLORS } from "../../constants/app";

export default function PinInput({ value, onChange, onSubmit, error, digits: digitCount = 6 }) {
  const inputs = Array.from({ length: digitCount }, () => useRef());

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !e.target.value && i > 0) inputs[i - 1].current?.focus();
    if (e.key === "Enter") onSubmit?.();
  };

  const handleChange = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const arr = (value || " ".repeat(digitCount)).split("");
    arr[i] = d || " ";
    const next = arr.join("");
    onChange(next.trim());
    if (d && i < digitCount - 1) inputs[i + 1].current?.focus();
  };

  const digitArr = (value || "").padEnd(digitCount, " ").split("");

  return (
    <div>
      <div className="flex gap-2 justify-center">
        {digitArr.map((d, i) => (
          <input key={i} ref={inputs[i]} type="tel" inputMode="numeric"
            maxLength={1} value={d.trim()} onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            className="w-12 h-12 text-center text-xl font-bold rounded-xl outline-none transition-all"
            style={{
              border: `2px solid ${error ? COLORS.error : d.trim() ? COLORS.gold : COLORS.border}`,
              background: "#fff", color: COLORS.textPrimary, fontSize: 22,
            }} />
        ))}
      </div>
      {error && <p className="text-xs text-center mt-2" style={{ color: COLORS.error }}>{error}</p>}
    </div>
  );
}
import { useState } from "react";
import { CITIES, COLORS } from "../../constants/app";

export function CityPicker({ onSelect }) {
  const [custom, setCustom] = useState("");
  const [mode,   setMode]   = useState("grid"); // "grid" | "custom"

  const handleCustom = () => {
    const t = custom.trim();
    if (t) onSelect(t.toUpperCase());
  };

  return (
    <div className="p-5 space-y-4">
      <div>
        <span className="inline-block text-xs font-bold tracking-widest px-3 py-1 rounded-full mb-3"
          style={{ background: `${COLORS.primary}15`, color: COLORS.primary }}>Step 1 of 3</span>
        <h2 className="text-2xl font-extrabold" style={{ color: COLORS.textPrimary }}>Select Your City</h2>
        <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>Where does your family live?</p>
      </div>

      {mode === "grid" ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {CITIES.map(city => (
              <button key={city} onClick={() => onSelect(city)}
                className="py-3 px-2 rounded-xl text-sm font-bold text-center border-2 transition-all active:scale-95"
                style={{ border: `2px solid ${COLORS.border}`, color: COLORS.primary, background: "#fff" }}>
                {city}
              </button>
            ))}
          </div>
          <button onClick={() => setMode("custom")}
            className="w-full py-3 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>
            + Enter Other City
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <input autoFocus value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCustom()}
            placeholder="Type city name..." className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ border: `2px solid ${COLORS.gold}`, fontSize: 16, color: COLORS.textPrimary }} />
          <div className="flex gap-2">
            <button onClick={() => setMode("grid")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border-2"
              style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>← Back</button>
            <button onClick={handleCustom} disabled={!custom.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: COLORS.primary }}>Continue →</button>
          </div>
        </div>
      )}
    </div>
  );
}

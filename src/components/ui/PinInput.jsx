// src/components/ui/PinInput.jsx
export default function PinInput({ value, onChange, onSubmit, error }) {
  return (
    <div>
      <input
        type="number"
        inputMode="numeric"
        placeholder="4-digit PIN"
        value={value}
        onChange={e => { onChange(e.target.value); }}
        onKeyDown={e => e.key === "Enter" && onSubmit?.()}
        maxLength={4}
        className="w-full rounded-xl px-4 py-3 outline-none text-center font-bold tracking-widest"
        style={{ border: "2px solid #f0e6e6", fontSize: 20 }}
      />
      {error && (
        <p className="text-xs mt-1 font-semibold" style={{ color: "#ef4444" }}>{error}</p>
      )}
    </div>
  );
}

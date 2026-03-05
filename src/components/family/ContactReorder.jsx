import { useState, useRef } from "react";
import { COLORS }           from "../../constants/app";

export function ContactReorder({ contacts, city, onReorder, onSubmit, onBack, submitting }) {
  const [items,    setItems]    = useState(contacts);
  const [dragging, setDragging] = useState(null);
  const [over,     setOver]     = useState(null);
  const dragId = useRef(null);
  const overId = useRef(null);

  function reorder(next) { setItems(next); onReorder(next); }

  function onDragStart(e, id) { dragId.current = id; setDragging(id); e.dataTransfer.effectAllowed = "move"; }
  function onDragEnter(id)    { overId.current = id; setOver(id); }
  function onDragEnd() {
    const from = items.findIndex(c => c.id === dragId.current);
    const to   = items.findIndex(c => c.id === overId.current);
    if (from !== -1 && to !== -1 && from !== to) {
      const next = [...items];
      next.splice(to, 0, next.splice(from, 1)[0]);
      reorder(next);
    }
    setDragging(null); setOver(null);
    dragId.current = null; overId.current = null;
  }

  function onTouchStart(e, id) { dragId.current = id; setDragging(id); }
  function onTouchMove(e) {
    e.preventDefault();
    const el  = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    const row = el?.closest("[data-rid]");
    if (row) { overId.current = row.dataset.rid; setOver(row.dataset.rid); }
  }
  function onTouchEnd() {
    if (overId.current) onDragEnd();
    else { setDragging(null); setOver(null); }
  }

  function handleSubmit() {
    if (!items.length) { alert("Add at least one contact."); return; }
    const hasSelf = items.some(c => c.isSelf);
    const final   = hasSelf ? items : items.map((c, i) => ({ ...c, isSelf: i === 0 }));
    onSubmit(final);
  }

  return (
    <div className="p-5 pb-8 flex flex-col gap-4">
      <div>
        <button onClick={onBack} className="text-xs font-bold mb-3" style={{ color: COLORS.textMuted }}>← Back</button>
        <span className="inline-block text-xs font-bold tracking-widest px-3 py-1 rounded-full mb-2"
          style={{ background: `${COLORS.primary}12`, color: COLORS.primary }}>Step 3 of 3</span>
        <h2 className="text-2xl font-extrabold" style={{ color: COLORS.textPrimary }}>Set Family Order</h2>
        <p className="text-sm mt-0.5" style={{ color: COLORS.textSecondary }}>Drag to reorder · First person = Head of family</p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((c, i) => (
          <div key={c.id} data-rid={c.id} draggable
            onDragStart={e => onDragStart(e, c.id)} onDragEnter={() => onDragEnter(c.id)}
            onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
            onTouchStart={e => onTouchStart(e, c.id)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 select-none cursor-grab"
            style={{
              opacity:     dragging === c.id ? 0.4 : 1,
              borderColor: over === c.id ? "#22c55e" : i === 0 ? "#f59e0b" : COLORS.border,
              background:  over === c.id ? "#f0fdf4" : i === 0 ? "#fffbeb" : "#fff",
            }}>
            <span className="text-gray-300 text-xl">⠿</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{c.name || "—"}</p>
              <p className="text-xs" style={{ color: COLORS.textSecondary }}>{c.phone || "—"}</p>
            </div>
            {i === 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: "#fef3c7", color: "#92400e" }}>👑 Head</span>
            )}
            {i !== 0 && <span className="text-xs font-bold" style={{ color: COLORS.textMuted }}>#{i + 1}</span>}
          </div>
        ))}
      </div>

      <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "#f9f9f9", color: COLORS.textMuted }}>
        💡 {city} Family · {items.length} member{items.length !== 1 ? "s" : ""}
      </div>

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full py-4 rounded-2xl font-extrabold text-white transition-all"
        style={{ background: submitting ? "#86efac" : "#22c55e" }}>
        {submitting ? "Registering…" : "Submit Family Registration ✓"}
      </button>
    </div>
  );
}

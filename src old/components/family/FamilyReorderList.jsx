import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// FamilyReorderList
//
// Shows all family members as draggable rows.
// Each row has:
//   - drag handle (☰)
//   - position number
//   - name + relation chip
//   - "Student" toggle button
//
// Uses pure touch/mouse drag — no external library needed.
//
// Props:
//   members        — array of member objects
//   onReorder      — (newOrderArray) => void
//   onToggleStudent— (memberIndex) => void
// ─────────────────────────────────────────────────────────────

export default function FamilyReorderList({ members, onReorder, onToggleStudent }) {
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // ── Mouse drag handlers ──
  const handleDragStart = (i) => setDraggingIdx(i);
  const handleDragOver  = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop      = (i) => {
    if (draggingIdx === null || draggingIdx === i) {
      setDraggingIdx(null); setDragOverIdx(null); return;
    }
    const reordered = [...members];
    const [moved]   = reordered.splice(draggingIdx, 1);
    reordered.splice(i, 0, moved);
    onReorder(reordered);
    setDraggingIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDraggingIdx(null); setDragOverIdx(null); };

  // ── Touch drag (mobile) ──
  const [touchStart, setTouchStart] = useState(null);

  const handleTouchStart = (e, i) => {
    setDraggingIdx(i);
    setTouchStart({ y: e.touches[0].clientY, idx: i });
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const y = e.touches[0].clientY;
    const rows = document.querySelectorAll(".family-row");
    rows.forEach((row, i) => {
      const rect = row.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setDragOverIdx(i);
      }
    });
  };

  const handleTouchEnd = () => {
    if (draggingIdx !== null && dragOverIdx !== null && draggingIdx !== dragOverIdx) {
      const reordered = [...members];
      const [moved]   = reordered.splice(draggingIdx, 1);
      reordered.splice(dragOverIdx, 0, moved);
      onReorder(reordered);
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
    setTouchStart(null);
  };

  // Relation color map
  const relationColor = (rel) => {
    const map = {
      Head: "bg-amber-100 text-amber-800",
      Father: "bg-blue-100 text-blue-800",
      Mother: "bg-pink-100 text-pink-800",
      Son: "bg-indigo-100 text-indigo-800",
      Daughter: "bg-purple-100 text-purple-800",
    };
    return map[rel] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-2" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {members.map((m, i) => {
        const isDragging = draggingIdx === i;
        const isOver     = dragOverIdx === i && draggingIdx !== i;

        return (
          <div
            key={`${m.name}-${m.number}-${i}`}
            className={`family-row flex items-center gap-3 bg-white border-2 rounded-2xl px-3 py-3 transition-all
              ${isDragging ? "opacity-40 scale-98 border-indigo-300 shadow-lg" : "border-gray-200 shadow-sm"}
              ${isOver     ? "border-indigo-400 bg-indigo-50 scale-100" : ""}
            `}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e  => handleDragOver(e, i)}
            onDrop={()     => handleDrop(i)}
            onDragEnd={handleDragEnd}
            onTouchStart={e => handleTouchStart(e, i)}
          >
            {/* Position number */}
            <span className="text-xs font-black text-gray-400 w-5 text-center flex-shrink-0">
              {i + 1}
            </span>

            {/* Drag handle */}
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none px-1">
              <div className="space-y-1">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* Name + relation */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{m.name || "—"}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {m.relation && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${relationColor(m.relation)}`}>
                    {m.relation}
                  </span>
                )}
                {m.number && (
                  <span className="text-xs text-gray-400">📞 {m.number}</span>
                )}
              </div>
            </div>

            {/* Student toggle */}
            <button
              type="button"
              onClick={() => onToggleStudent(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95
                ${m.isStudent
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-white text-gray-500 border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
                }`}
            >
              {m.isStudent ? "✓ Student" : "Student?"}
            </button>
          </div>
        );
      })}

      {/* Hint */}
      <p className="text-xs text-gray-400 text-center pt-1">
        ☰ Hold and drag to reorder · Tap "Student?" to mark
      </p>
    </div>
  );
}

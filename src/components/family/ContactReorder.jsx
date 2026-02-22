import { useState, useRef } from "react";

export function ContactReorder({
  contacts,
  city,
  onReorder,
  onSubmit,
  onBack,
  submitting
}) {
  const [items, setItems] = useState(contacts);
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const dragId = useRef(null);
  const overId = useRef(null);

  function reorder(newItems) {
    setItems(newItems);
    onReorder(newItems);
  }

  // ⭐ Mark creator (self)
  function markSelf(id) {
    const next = items.map((c) => ({
      ...c,
      isSelf: c.id === id
    }));
    reorder(next);
  }

  // ── Mouse drag ─────────────────────────────────
  function onDragStart(e, id) {
    dragId.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnter(id) {
    overId.current = id;
    setOver(id);
  }

  function onDragEnd() {
    const from = items.findIndex((c) => c.id === dragId.current);
    const to = items.findIndex((c) => c.id === overId.current);

    if (from !== -1 && to !== -1 && from !== to) {
      const next = [...items];
      next.splice(to, 0, next.splice(from, 1)[0]);
      reorder(next);
    }

    setDragging(null);
    setOver(null);
    dragId.current = null;
    overId.current = null;
  }

  // ── Touch drag ─────────────────────────────────
  function onTouchStart(e, id) {
    dragId.current = id;
    setDragging(id);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const el = document.elementFromPoint(
      e.touches[0].clientX,
      e.touches[0].clientY
    );
    const row = el?.closest("[data-rid]");
    if (row) {
      overId.current = row.dataset.rid;
      setOver(row.dataset.rid);
    }
  }

  function onTouchEnd() {
    if (overId.current) onDragEnd();
    else {
      setDragging(null);
      setOver(null);
    }
  }

  // ⭐ VALIDATION BEFORE SUBMIT
  function handleSubmit() {
    if (items.length === 0) {
      alert("Add at least one contact.");
      return;
    }

    const selfCount = items.filter((c) => c.isSelf).length;

    if (selfCount === 0) {
      alert("Please select your contact (👤 Me).");
      return;
    }

    if (selfCount > 1) {
      alert("Only one contact can be marked as yourself.");
      return;
    }

    onSubmit(items);
  }

  return (
    <div className="p-5 pb-8 flex flex-col gap-4">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="text-xs font-bold text-gray-400 hover:text-gray-700 mb-3"
        >
          ← Back
        </button>

        <span className="inline-block text-xs font-bold tracking-widest text-green-700 bg-green-50 px-3 py-1 rounded-full mb-2 uppercase">
          Step 3 of 3
        </span>

        <h2 className="text-2xl font-extrabold text-gray-900">
          Set Family Order
        </h2>

        <p className="text-sm text-gray-500">
          Drag to reorder · First person becomes Head · Select 👤 for yourself
        </p>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {items.map((c, i) => (
          <div
            key={c.id}
            data-rid={c.id}
            draggable
            onDragStart={(e) => onDragStart(e, c.id)}
            onDragEnter={() => onDragEnter(c.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onTouchStart={(e) => onTouchStart(e, c.id)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 select-none cursor-grab ${
              dragging === c.id
                ? "opacity-40"
                : over === c.id
                ? "border-green-400 bg-green-50"
                : i === 0
                ? "border-amber-300 bg-amber-50"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* Handle */}
            <span className="text-gray-300 text-xl">⠿</span>

            {/* Info */}
            <div className="flex-1">
              <p className="text-sm font-bold">{c.name || "—"}</p>
              <p className="text-xs text-gray-400">{c.phone}</p>
            </div>

            {/* 👑 Head */}
            {i === 0 && (
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                👑 Head
              </span>
            )}

            {/* 👤 Me selector */}
            <button
              onClick={() => markSelf(c.id)}
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                c.isSelf
                  ? "bg-blue-100 text-blue-700 border-blue-300"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              👤 Me
            </button>

            {/* Order */}
            {i !== 0 && (
              <span className="text-xs font-bold text-gray-300">
                #{i + 1}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
        💡 {city} Family · {items.length} member
        {items.length !== 1 ? "s" : ""}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`w-full py-4 rounded-2xl font-extrabold ${
          submitting
            ? "bg-green-300 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        {submitting ? "Registering…" : "Submit Family Registration ✓"}
      </button>
    </div>
  );
}
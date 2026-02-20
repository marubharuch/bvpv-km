import { useState } from "react";

export default function StudentPaperField({
  label,
  value,
  onSave,
  width = "w-48",
  type = "text",
}) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value || "");

  return (
    <div className="flex items-center gap-2 mb-2 text-[15px]">
      <span className="whitespace-nowrap">{label}</span>

      <div
        onClick={() => setOpen(true)}
        className={`border-b border-black ${width} min-h-[20px] cursor-pointer text-center`}
      >
       <span className="text-gray-400">
  {value || "Tap to enter"}
</span>

      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-72">
            <h2 className="font-semibold mb-2">{label}</h2>
            <input
              autoFocus
              type={type}
              className="border w-full p-2 mb-3"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
            />
            <button
              className="bg-blue-700 text-white px-4 py-2 rounded w-full"
              onClick={() => {
                onSave(temp);
                setOpen(false);
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";

const CITIES = [
  "AHMEDABAD","ANAND","BAKROL","BHARUCH","BHILAD","BORSAD",
  "DABHOI","JITODIYA","KAVITHA","KHAMBHAT","MAHEMDABAD","MASAROD",
  "MOGRI","MOTI SHERDI","MUMBAI","NAPAD","NAVSARI","ODE","PADRA",
  "PETLAD","SURAT","VADODARA","VALLABH VIDYANAGAR","VALVOD","VAPI",
  "VATADARA","CANADA","USA","UK","AUSTRALIA","OTHER",
];

export function CityPicker({ onSelect }) {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [hi, setHi]             = useState(0);
  const inputRef                = useRef(null);

  const filtered = query.trim()
    ? CITIES.filter((c) => c.includes(query.toUpperCase()))
    : CITIES;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setHi(0); }, [query]);

  function select(city) {
    setQuery(city);
    setOpen(false);
    onSelect(city);
  }

  function onKeyDown(e) {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); filtered[hi] && select(filtered[hi]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="p-6 pb-8">
      {/* Header */}
      <span className="inline-block text-xs font-bold tracking-widest text-green-700 bg-green-50 px-3 py-1 rounded-full mb-3 uppercase">
        Step 1 of 3
      </span>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Where is your family from?</h2>
      <p className="text-sm text-gray-500 mb-5">Select your native village or city</p>

      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">📍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search native / city…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className="w-full pl-10 pr-9 py-3.5 text-sm font-semibold bg-gray-50 border-2 border-gray-200 rounded-xl outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-300"
            onClick={() => { setQuery(""); setOpen(true); inputRef.current?.focus(); }}
          >✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((city, i) => (
            <li
              key={city}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold cursor-pointer transition ${
                i === hi ? "bg-green-50 text-green-800" : "text-gray-700 hover:bg-gray-50"
              }`}
              onMouseDown={() => select(city)}
              onMouseEnter={() => setHi(i)}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              {city}
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && (
        <div className="mt-2 p-4 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No match —{" "}
          <button
            className="text-green-600 font-bold underline"
            onMouseDown={() => { const v = query.trim().toUpperCase(); if (v) select(v); }}
          >
            use "{query.trim().toUpperCase()}"
          </button>
        </div>
      )}
    </div>
  );
}

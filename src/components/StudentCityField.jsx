import { useState, useEffect, useRef } from "react";

export default function StudentCityField({ label, value, onSave }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const abortController = useRef(null);

  useEffect(() => {
    if (temp.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchCities(temp);
    }, 350);

    return () => clearTimeout(timer);
  }, [temp]);

  const fetchCities = async (text) => {
    try {
      if (abortController.current) {
        abortController.current.abort(); // cancel old request
      }

      abortController.current = new AbortController();

      setLoading(true);

      const res = await fetch(
        `https://secure.geonames.org/searchJSON?featureClass=P&maxRows=20&name_startsWith=${encodeURIComponent(
          text
        )}&username=sgs_jain`,
        { signal: abortController.current.signal }
      );

      const data = await res.json();

      if (!data.geonames) {
        setResults([]);
        setLoading(false);
        return;
      }

      // keep full object for future (state, district)
      const cleaned = data.geonames
        .filter((c) => c.countryName === "India" && c.adminName1)
        .map((c) => ({
          label: `${c.name}, ${c.adminName1}`,
          city: c.name,
          state: c.adminName1,
          district: c.adminName2,
        }));

      const unique = Array.from(new Map(cleaned.map(i => [i.label, i])).values());

      setResults(unique.slice(0, 8));
      setLoading(false);

    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      <span>{label}</span>

      <div
        onClick={() => setOpen(true)}
        className="border-b border-black w-48 min-h-[20px] cursor-pointer text-center text-gray-700"
      >
        {value || "Tap to enter"}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-72 max-h-[80vh] overflow-auto">
            <h2 className="font-semibold mb-2">{label}</h2>

            <input
              autoFocus
              className="border w-full p-2 mb-2"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              placeholder="Type city..."
            />

            {loading && <div className="text-xs text-gray-500">Searching...</div>}

            {results.map((item, i) => (
              <div
                key={i}
                className="p-1 cursor-pointer hover:bg-gray-100 text-sm"
                onClick={() => {
                  onSave(item.city, item.state, item.district);
                  setOpen(false);
                }}
              >
                {item.label}
              </div>
            ))}

            <button
              className="bg-blue-600 text-white w-full mt-2 p-2 rounded"
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

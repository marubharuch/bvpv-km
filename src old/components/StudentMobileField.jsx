import { useState, useEffect } from "react";

export default function StudentMobileField({ value, onSave }) {
  const [showPopup, setShowPopup] = useState(false);
  const [isIndia, setIsIndia] = useState(null);
  const [countryCode, setCountryCode] = useState("+91");
  const [tempPhone, setTempPhone] = useState("");

  // If field cleared → show popup again
  useEffect(() => {
    if (!value) {
      setIsIndia(null);
    }
  }, [value]);

  return (
    <>
      {/* Mobile Input Field */}
      <div className="flex items-center gap-2 mb-2">
        <span>Mobile:</span>
        <input
          type="tel"
          value={value || ""}
          onFocus={() => {
            if (!value) setShowPopup(true);
          }}
          onChange={(e) => onSave(e.target.value)}
          className="border-b border-black bg-transparent"
          placeholder="Enter mobile number"
        />
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded w-80 shadow-lg">

            {/* Step 1 */}
            {isIndia === null && (
              <>
                <p className="font-semibold mb-3 text-center">
                  Are you in India?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setIsIndia(true);
                      setCountryCode("+91");
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setIsIndia(false)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    No
                  </button>
                </div>
              </>
            )}

            {/* India flow */}
            {isIndia === true && (
              <>
                <p className="mb-2">Enter 10-digit mobile number</p>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  className="border w-full p-2 mb-3"
                  onChange={(e) =>
                    setTempPhone(e.target.value.replace(/\D/g, ""))
                  }
                />
                <button
                  className="bg-green-600 text-white w-full p-2 rounded"
                  onClick={() => {
                    onSave(`+91 ${tempPhone}`);
                    setShowPopup(false);
                    setIsIndia(null);
                    setTempPhone("");
                  }}
                >
                  Save
                </button>
              </>
            )}

            {/* International flow */}
            {isIndia === false && (
              <>
                <p className="mb-2">Enter country code and mobile</p>
                <input
                  className="border w-full p-2 mb-2"
                  placeholder="+44"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                />
                <input
                  inputMode="numeric"
                  className="border w-full p-2 mb-3"
                  placeholder="Mobile Number"
                  onChange={(e) =>
                    setTempPhone(e.target.value.replace(/\D/g, ""))
                  }
                />
                <button
                  className="bg-green-600 text-white w-full p-2 rounded"
                  onClick={() => {
                    onSave(`${countryCode} ${tempPhone}`);
                    setShowPopup(false);
                    setIsIndia(null);
                    setTempPhone("");
                  }}
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

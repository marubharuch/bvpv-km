
import { useState } from "react";

export default function About() {
  const [lang, setLang] = useState("guj");

  return (
    <div className="max-w-md mx-auto p-4 text-gray-800">

      {/* Language Switch */}
      <div className="flex justify-end gap-2 text-xs mb-3">
        <button
          onClick={() => setLang("eng")}
          className={`px-2 py-1 rounded ${lang==="eng" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          ENG
        </button>
        <button
          onClick={() => setLang("guj")}
          className={`px-2 py-1 rounded ${lang==="guj" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          ગુજરાતી
        </button>
      </div>

      {/* Single Card */}
      <div className="bg-white p-4 rounded shadow space-y-4 text-sm leading-relaxed">

        {/* Title */}
        <h2 className="text-lg font-bold text-center">
          {lang === "eng" ? "💻 Project Information" : "💻 પ્રોજેક્ટ માહિતી"}
        </h2>

        {/* Official Note */}
        {lang === "eng" ? (
          <>
            <p>
              This project has been created to effectively fulfill the objectives of the Mandal.
              It has been developed under the guidance of 
              <span className="font-semibold"> Shree Ashwin Shah (C.A.), Secretary</span>.
            </p>

            <p>
              The project was initiated through the joint efforts of 
              <span className="font-semibold"> Mr. Sanjay Shah</span>, a hobby programmer with interest in technology, 
              and his daughter <span className="font-semibold"> Hetavi Shah</span>, who is working in the IT industry.
            </p>

            <p>
              Through this project, IT professionals and students from our community are warmly invited to contribute technically for the benefit of society.
            </p>

            <p>Having trouble using the website? Please let us know.</p>
          </>
        ) : (
          <>
            <p>
              મંડળના ઉદ્દેશ્યોને વધુ અસરકારક રીતે સાકાર કરવા માટે આ પ્રોજેક્ટની રચના કરવામાં આવી છે.
              આ પ્રોજેક્ટ મંડળના સેક્રેટરી 
              <span className="font-semibold"> શ્રી અશ્વિન શાહ (C.A.)</span> ના માર્ગદર્શન હેઠળ તૈયાર કરવામાં આવ્યો છે.
            </p>

            <p>
              પ્રોજેક્ટની શરૂઆત <span className="font-semibold">શ્રી સંજય શાહ</span> તથા તેમની પુત્રી 
              <span className="font-semibold"> હેતવી શાહ</span> ના સંયુક્ત પ્રયત્નોથી કરવામાં આવી છે.
            </p>

            <p>
              આ પ્રોજેક્ટ દ્વારા આપણા સમાજના આઈ.ટી. પ્રોફેશનલ્સ અને સ્ટુડન્ટ્સને સમાજ માટે ટેક્નિકલ યોગદાન આપવા હાર્દિક આમંત્રણ આપવામાં આવે છે.
            </p>

            <p>વેબસાઇટ વાપરવામાં કોઈ મુશ્કેલી આવે તો કૃપા કરીને જાણ કરો.</p>
          </>
        )}

        {/* Report Issue Button */}
        <div className="text-center">
          <a
            href="https://wa.me/919974021397?text=BVPV%20Website%20issue"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-lg shadow-md"
          >
            {lang === "eng" ? "Report an Issue" : "સમસ્યા જણાવો"}
          </a>
        </div>

        {/* Meet the Developers (Always English) */}
        <div className="border-t pt-4">
          <h3 className="text-center font-bold text-base mb-3">
            👩‍💻 Meet the Developers
          </h3>

          <div className="flex gap-3 items-center bg-gray-50 p-3 rounded mb-3">
            <img
              src="/hss.jpg"
              alt="Hetavi Shah"
              className="w-16 h-20 object-cover border shadow-sm"
            />
            <div>
              <p className="font-semibold">Hetavi Shah</p>
              <p className="text-gray-600 text-xs">
                Working in IT industry in Business Analytics & Business Intelligence domain.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-center bg-gray-50 p-3 rounded">
            <img
              src="/hss2.jpg"
              alt="Sanjay Shah"
              className="w-16 h-20 object-cover border shadow-sm"
            />
            <div>
              <p className="font-semibold">Sanjay Shah</p>
              <p className="text-gray-600 text-xs">
                Technology enthusiast and hobby programmer contributing to planning and development.
              </p>
            </div>
          </div>
        </div>

        {/* GitHub */}
        <div className="border-t pt-3">
          <p className="font-semibold">🔗 GitHub</p>
          <a
            href="https://github.com/marubharuch/bvpv-km"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline break-all"
          >
            https://github.com/marubharuch/bvpv-km
          </a>
        </div>

        {/* Firebase */}
        <div className="border-t pt-3">
          <p className="font-semibold">☁ Firebase Account</p>
          <p className="font-semibold break-all">oswalbvpv@gmail.com</p>
        </div>

      </div>
    </div>
  );
}

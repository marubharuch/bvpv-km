import { useState } from "react";

export default function Home() {
  const [lang, setLang] = useState("gu"); // default Gujarati

  const content = {
    gu: {
      title: "મહત્વપૂર્ણ સૂચના – તમામ વિદ્યાર્થીઓ માટે",
     
      intro:
        "કેળવણી મંડળ દ્વારા સમાજના તમામ વિદ્યાર્થીઓનું સુવ્યવસ્થિત ડેટાબેઝ તૈયાર કરવાની કામગીરી શરૂ કરવામાં આવી છે.",
      points: [
        "કારકિર્દી માર્ગદર્શન",
        "સરકારી યોજનાઓ અને શૈક્ષણિક સહાય અંગે માહિતી",
        "આર્થિક રીતે જરૂરિયાત ધરાવતા વિદ્યાર્થીઓને સહાય",
        "અન્ય શૈક્ષણિક તથા જરૂરી માર્ગદર્શન",
      ],
      request:
        "દરેક વિદ્યાર્થી સુધી યોગ્ય સમયે યોગ્ય સહાય પહોંચે તે માટે રજીસ્ટ્રેશન અત્યંત જરૂરી છે. કૃપા કરીને એપમાં તમારી માહિતી નોંધાવી રજીસ્ટ્રેશન અવશ્ય પૂર્ણ કરો.",
      footer: " અશ્વિન શાહ",
      button: "English",
    },
    en: {
      title: "Important Notice – For All Students",
     
      intro:
        "The KADAVANI MANDAL has started preparing a structured student database.",
      points: [
        "Career guidance",
        "Information about government schemes & education support",
        "Financial assistance for needy students",
        "Other educational and personal guidance",
      ],
      request:
        "To ensure timely support, registration is very important. Please complete your registration in the app.",
      footer: " Ashwin Shah",
      button: "ગુજરાતી",
    },
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex justify-center px-4 py-6">
      <div className="w-full max-w-md">
        
        {/* Language Switch */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setLang(lang === "gu" ? "en" : "gu")}
            className="text-sm bg-white border border-amber-400 text-amber-700 px-3 py-1 rounded-full shadow-sm active:scale-95"
          >
            {t.button}
          </button>
        </div>
  

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4 border border-amber-100">
          <h1 className="text-lg font-bold text-center text-amber-800 leading-snug">
            {t.title}
          </h1>

          <h2 className="text-center font-semibold text-gray-700 text-sm">
            {t.org}
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed">{t.intro}</p>

          <ul className="space-y-2 text-sm text-gray-700">
            {t.points.map((point, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-gray-600 leading-relaxed">{t.request}</p>

          <div className="pt-3 border-t text-right">
            <p className="font-medium text-gray-800 text-sm">{t.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

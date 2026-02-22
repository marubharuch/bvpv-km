export default function Contact() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-6">

      {/* 🏛️ HEADER */}
     

      {/* 👑 Office Bearers */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-base font-bold text-blue-900 border-b pb-2 mb-3">
          👑 મુખ્ય હોદ્દા (Office Bearers)
        </h2>

        <ul className="space-y-2 text-gray-800">
          <li>President (પ્રેસિડેન્ટ)</li>
          <li>Vice President (વાઈસ પ્રેસિડેન્ટ)</li>
          <li>Secretary (સેક્રેટરી)</li>
          <li>Joint Secretary (સહ સેક્રેટરી)</li>
          <li>Treasurer (ખજાનચી)</li>
          <li>Joint Treasurer (સહ ખજાનચી)</li>
        </ul>
      </div>

      {/* 👥 Executive Committee */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-base font-bold text-blue-900 border-b pb-2 mb-3">
          👥 કાર્યકારી સમિતિ (Executive)
        </h2>

        <ul className="space-y-2 text-gray-800">
          <li>Executive Member (કાર્યકારી સભ્ય)</li>
          <li>Invited Member (આમંત્રિત સભ્ય)</li>
          <li>Advisor (સલાહકાર)</li>
        </ul>
      </div>

      {/* ⭐ Optional Roles */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-base font-bold text-blue-900 border-b pb-2 mb-3">
          ⭐ વિશેષ જવાબદારીઓ (Optional Roles)
        </h2>

        <ul className="space-y-2 text-gray-800">
          <li>Coordinator (કોઓર્ડિનેટર)</li>
          <li>Joint Coordinator (સહ કોઓર્ડિનેટર)</li>
          <li>Media Coordinator (મીડિયા કોઓર્ડિનેટર)</li>
          <li>IT Coordinator (આઈટી કોઓર્ડિનેટર)</li>
          <li>Cultural Head (સાંસ્કૃતિક વિભાગ)</li>
          <li>Sports Head (રમતગમત વિભાગ)</li>
          <li>Youth Head (યુવા વિભાગ)</li>
          <li>Women Head (મહિલા વિભાગ)</li>
        </ul>
      </div>

    </div>
  );
}

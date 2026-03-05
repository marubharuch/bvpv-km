// ─── tourSteps.js ─────────────────────────────────────────────────────────────

// ── Phase 1: Bottom Navbar tour ────────────────────────────────────────────────
export const NAVBAR_TOUR_STEPS = [
  {
    target: "tour-home",
    title: "🏠 Home",
    desc: "Main page — આ એપ્લિકેશનના હેતુ વિશેની માહિતી, ભવિષ્યમાં latest updates અને important information અહીં મળશે.",
    position: "top",
  },
  {
    target: "tour-leaders",
    title: "👑 Leaders",
    desc: "કેળવણી મંડળ, સેવા સમાજ અને સુરક્ષા ટ્રસ્ટ, વિવિધ ગામના સમાજ પ્રમુખશ્રીઓ તેમજ કારોબારી સભ્યોના નામ અને ફોટા અહીં જોઈ શકશો. WhatsApp દ્વારા સીધો સંપર્ક પણ કરી શકશો.",
    position: "top",
  },
  {
    target: "tour-about",
    title: "ℹ️ About",
    desc: "એપ ડેવલપર વિશેની માહિતી અને ટેકનિકલ સહાય માટે આ પેજની મુલાકાત લો.",
    position: "top",
  },
  {
    target: "tour-competition",
    title: "🏆 Competition",
    desc: "Competitions join કરો, leaderboard જુઓ અને prizes જીતો!",
    position: "top",
  },
  {
    target: "tour-last",
    title: "📊 Dashboard / Login",
    desc: "Login કરો, ત્યારબાદ અહીં ડેશબોર્ડ જોવા મળશે. અહીં ક્લિક કરી તમારા પરિવારની માહિતી (Data) અપડેટ રાખો.",
    position: "top",
  },
];

// ── Phase 2: Dashboard page tour ───────────────────────────────────────────────
export const DASHBOARD_TOUR_STEPS = [
    
  
    {
    target: "tour-profile-section",
    title: "👤 તમારી Family Profile",
    desc: "અહીં , city,તમારું વતન (Native) અને સરનામું (Address) અહીં ઉમેરો, અને ભવિષ્યમાં તેમાં કોઈ પણ ફેરફાર હોય તો અહીંથી સુધારો કરી શકશો",
    position: "bottom",
  },
// DASHBOARD_TOUR_STEPS માં tour-member-list પછી ઉમેરો
{
  target: "tour-edit-member",
  title: "✏️ Member Edit કરો",
  desc: "આ button tap કરો — member ની details જેમ કે નામ, મોબાઈલ, DOB, વ્યવસાય વગેરે edit કરી શકો.",
  position: "top",
},




  {
    target: "tour-member-photo",
    title: "📸 Photo Upload",
    desc: "Member ના photo પર tap કરો — કેમેરા અથવા ગેલેરીમાંથી ફોટો અપલોડ કરો. .",
    position: "top",
  },
  {
    target: "tour-member-list",
    title: "👨‍👩‍👧 Family Members",
    desc: "બધા family members અહીં દેખાય. Member invite કરો.",
    position: "top",
  },
  {
    target: "tour-add-member",
    title: "➕ Member ઉમેરો",
    desc: "આ button tap કરીને નવો family member add કરો — spouse, children, parents.",
    position: "top",
  },
];
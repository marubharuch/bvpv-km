// constants/app.js — Single source of truth for all app-wide constants.

export const APP_NAME    = "વિશા ઓશવાળ જૈન કેળવણી મંડળ-2";
export const APP_TAGLINE = "બોરસદ – વાલવોડ – પાદરા – વટાદરા";
export const APP_URL     = "https://bvpv-km.web.app/";

export const COLORS = {
  primary:       "#7B1C2E",
  primaryDark:   "#5A1020",
  primaryLight:  "#9B2335",
  gold:          "#C9A84C",
  goldLight:     "#F0D080",
  goldFaint:     "#FDF0D0",
  bg:            "#FDF6EC",
  textPrimary:   "#3D0010",
  textSecondary: "#9B6060",
  textMuted:     "#C0A0A0",
  border:        "#f0e6e6",
  error:         "#ef4444",
};

export const GRADIENTS = {
  header: "linear-gradient(135deg, #5A1020 0%, #7B1C2E 50%, #9B2335 100%)",
  gold:   "linear-gradient(90deg, #C9A84C, #F0D080)",
};

export const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳", name: "India"     },
  { code: "+1",   flag: "🇺🇸", name: "USA"        },
  { code: "+44",  flag: "🇬🇧", name: "UK"         },
  { code: "+61",  flag: "🇦🇺", name: "Australia"  },
  { code: "+971", flag: "🇦🇪", name: "UAE"        },
  { code: "+974", flag: "🇶🇦", name: "Qatar"      },
  { code: "+965", flag: "🇰🇼", name: "Kuwait"     },
  { code: "+968", flag: "🇴🇲", name: "Oman"       },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia"   },
  { code: "+65",  flag: "🇸🇬", name: "Singapore"  },
  { code: "+49",  flag: "🇩🇪", name: "Germany"    },
  { code: "+81",  flag: "🇯🇵", name: "Japan"      },
];

export const CITIES = [
  "Borsad","Ahmedabad","Surat","Vadodara","Anand",
  "Nadiad","Bharuch","Mumbai","Rajkot","NRI","Other",
];

export const HONORARY_ORGS = [
  { id: "kadavani", label: "કેળવણી મંડળ",   askName: false },
  { id: "seva",     label: "સેવા સમાજ",      askName: false },
  { id: "suraksha", label: "સુરક્ષા ટ્રસ્ટ", askName: false },
  { id: "sthanik",  label: "સ્થાનિક સમાજ",   askName: true  },
  { id: "other",    label: "અન્ય સંસ્થા",     askName: true  },
];

export const POST_SUGGESTIONS = [
  "પ્રમુખ","ઉપ-પ્રમુખ","મંત્રી","સહ-મંત્રી",
  "ખજાનચી","ટ્રસ્ટી","કારોબારી સભ્ય","સંયોજક",
];

export const EDUCATION_TYPES      = ["School Student","College Student","Postgraduate","Diploma / ITI","Professional Course","Competitive Prep"];
export const SCHOOL_STANDARDS     = ["Nursery","Jr KG","Sr KG","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
export const COLLEGE_YEARS        = ["1st Year","2nd Year","3rd Year","Final Year"];
export const PG_YEARS             = ["PG Year 1","PG Final Year"];
export const DIPLOMA_YEARS        = ["Year 1","Year 2","Year 3"];
export const DEGREE_PROGRAMS      = ["BSc","BCom","BA","BBA","BE/BTech","MBBS","BDS","BPharma","Law","Other"];
export const PROFESSIONAL_COURSES = ["CA","CS","CMA","CFA","Other"];
export const PROFESSIONAL_STAGES  = ["Foundation","Inter","Final"];
export const STREAM_STANDARDS     = ["11th","12th"];

export const SKILL_CATEGORIES = [
  { key: "indoorSports",  label: "Indoor Sports",  emoji: "🏓", options: ["Chess","Carrom","TT","Badminton (Indoor)","Snooker"] },
  { key: "outdoorSports", label: "Outdoor Sports", emoji: "🏏", options: ["Cricket","Badminton","Football","Kabaddi","Athletics"] },
  { key: "talents",       label: "Talents",        emoji: "🎤", options: ["Singing","Dancing","Anchoring","Acting","Public Speaking"] },
  { key: "creative",      label: "Creative",       emoji: "🎨", options: ["Reel Making","Content Writing","Photography","Drawing","Craft"] },
  { key: "hobbies",       label: "Hobbies",        emoji: "📖", options: ["Trekking","Reading","Gardening","Cooking","Travel"] },
  { key: "funActivities", label: "Fun",            emoji: "🎉", options: ["Antakshari","Quiz","One Minute Games","Dumb Charades"] },
];

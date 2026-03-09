// constants/vanshConstants.js
// Colors mirror app's COLORS from constants/app.js exactly.

export const VSC = {
  // ── Backgrounds — cream/warm white (= app's COLORS.bg / white) ─
  bg:           "#FDF6EC",   // COLORS.bg
  sidebar:      "#FDF0D0",   // COLORS.goldFaint — slightly deeper cream for panels
  panel:        "#FFFFFF",   // card backgrounds
  border:       "#f0e6e6",   // COLORS.border

  // ── Interactive ───────────────────────────────────────────────
  hover:        "#FDE8EC",   // light rose hover
  select:       "#FDE8EC",   // selected row bg
  selectBorder: "#7B1C2E",   // COLORS.primary — maroon ring

  // ── Text ──────────────────────────────────────────────────────
  text:         "#3D0010",   // COLORS.textPrimary
  dim:          "#C0A0A0",   // COLORS.textMuted
  textSecondary:"#9B6060",   // COLORS.textSecondary

  // ── Syntax token colors — maroon/gold family ──────────────────
  kwColor:      "#7B1C2E",   // keywords   → COLORS.primary (maroon)
  yellow:       "#9a7830",   // functions  → gold dark
  strColor:     "#9B2335",   // strings    → COLORS.primaryLight
  numColor:     "#C9A84C",   // numbers    → COLORS.gold
  commentColor: "#C0A0A0",   // comments   → COLORS.textMuted
  varColor:     "#5A1020",   // variables  → COLORS.primaryDark
  typeColor:    "#7B1C2E",   // types      → COLORS.primary
  pink:         "#9B2335",   // spouse ♥   → primaryLight

  // ── Status ────────────────────────────────────────────────────
  green:        "#2E7D32",
  red:          "#ef4444",   // COLORS.error

  // ── Gold shades ───────────────────────────────────────────────
  gold:         "#C9A84C",   // COLORS.gold
  goldBright:   "#F0D080",   // COLORS.goldLight
  goldDark:     "#9a7830",
  goldFaint:    "#FDF0D0",   // COLORS.goldFaint

  // ── Gender dots ───────────────────────────────────────────────
  male:         "#7B1C2E",   // maroon
  female:       "#9B2335",   // primaryLight

  // ── Tree indent guide lines ───────────────────────────────────
  indentGuide:  "#f0e6e6",   // COLORS.border

  rowH: 28,                  // slightly taller for light/airy feel
};

export const ANC_RELATIONS = [
  "father",
  "grandfather",
  "great-grandfather",
  "great²-grandfather",
  "great³-grandfather",
];

export const DESC_RELATIONS = [
  "son/daughter",
  "grandson/daughter",
  "great-grandchild",
  "great²-grandchild",
];

export const TREE_STEPS = {
  SELF:      1,
  ANCESTORS: 2,
  DESCS:     3,
  PREVIEW:   4,
  SPOUSES:   5,
  SIBLINGS:  6,
  COUSINS:   7,
  FULL_TREE: 8,
};

export const TAB_LABELS = [
  { icon: "👤", name: "self",         ext: ".ts"       },
  { icon: "⬆️", name: "ancestors",   ext: ".ts"       },
  { icon: "⬇️", name: "descendants", ext: ".ts"       },
  { icon: "🌲", name: "preview",     ext: ".json"     },
  { icon: "💑", name: "spouses",     ext: ".ts"       },
  { icon: "👥", name: "siblings",    ext: ".ts"       },
  { icon: "🤝", name: "cousins",     ext: ".ts"       },
  { icon: "🎉", name: "tree",        ext: ".explorer" },
];

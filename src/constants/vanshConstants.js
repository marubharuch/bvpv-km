// constants/vanshConstants.js
// Colors mirror app's COLORS from constants/app.js exactly.

export const VSC = {
  // ── Backgrounds ────────────────────────────────────────────────
  bg:           "#FDF6EC",
  sidebar:      "#FDF0D0",
  panel:        "#FFFFFF",
  border:       "#f0e6e6",

  // ── Interactive ───────────────────────────────────────────────
  hover:        "#FDE8EC",
  select:       "#FDE8EC",
  selectBorder: "#7B1C2E",

  // ── Text ──────────────────────────────────────────────────────
  text:          "#3D0010",
  dim:           "#C0A0A0",
  textSecondary: "#9B6060",

  // ── Syntax tokens ────────────────────────────────────────────
  kwColor:      "#7B1C2E",
  yellow:       "#9a7830",
  strColor:     "#9B2335",
  numColor:     "#C9A84C",
  commentColor: "#C0A0A0",
  varColor:     "#5A1020",
  typeColor:    "#7B1C2E",
  pink:         "#9B2335",

  // ── Status ───────────────────────────────────────────────────
  green:        "#2E7D32",
  red:          "#ef4444",

  // ── Gold shades ──────────────────────────────────────────────
  gold:         "#C9A84C",
  goldBright:   "#F0D080",
  goldDark:     "#9a7830",
  goldFaint:    "#FDF0D0",

  // ── Gender dots ──────────────────────────────────────────────
  male:         "#7B1C2E",
  female:       "#9B2335",

  // ── Tree indent guides ───────────────────────────────────────
  indentGuide:  "#f0e6e6",
  rowH:         28,
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
  "grandson/granddaughter",
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
  { icon: "👤", name: "self",        ext: ".ts"       },
  { icon: "⬆️", name: "ancestors",  ext: ".ts"       },
  { icon: "⬇️", name: "descendants",ext: ".ts"       },
  { icon: "🌲", name: "preview",    ext: ".json"     },
  { icon: "💑", name: "spouses",    ext: ".ts"       },
  { icon: "👥", name: "siblings",   ext: ".ts"       },
  { icon: "🤝", name: "cousins",    ext: ".ts"       },
  { icon: "🎉", name: "tree",       ext: ".explorer" },
];

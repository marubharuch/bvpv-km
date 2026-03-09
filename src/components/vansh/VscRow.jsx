// components/vansh/VscRow.jsx
// Core tree row — light cream theme matching app's COLORS.

import { VSC } from "../../constants/vanshConstants";

export default function VscRow({
  node, guides = [], hasChildren = false, isOpen = false,
  onToggle, onSelect, isSelected = false,
}) {
  const rowBg = isSelected       ? VSC.select
    : node.type === "you"        ? VSC.goldFaint
    : node.type === "spouse"     ? "#FFF0F3"
    : node.type === "anc"        ? "#FFFAF5"
    : "transparent";

  const rowBorderLeft = isSelected      ? `2px solid ${VSC.kwColor}`
    : node.type === "you"               ? `2px solid ${VSC.gold}`
    : node.type === "anc"               ? `2px solid ${VSC.border}`
    : "2px solid transparent";

  const nameColor =
    node.type === "you"    ? VSC.varColor      :
    node.type === "anc"    ? VSC.textSecondary :
    node.type === "child"  ? VSC.kwColor       :
    node.type === "spouse" ? VSC.pink          :
    node.type === "sib"    ? VSC.strColor      :
    VSC.text;

  const nameFontStyle  = node.type === "anc" ? "italic" : "normal";
  const nameFontWeight = node.type === "you" ? 700 : 500;

  const dotColor = node.gender === "F" ? VSC.female : VSC.male;

  const metaParts = [];
  if (node.relation && node.type !== "you") metaParts.push(node.relation);
  if (node.year) metaParts.push(node.year);

  return (
    <div
      onClick={onSelect}
      style={{
        display:       "flex",
        alignItems:    "center",
        height:        `${VSC.rowH}px`,
        cursor:        "pointer",
        background:    rowBg,
        borderLeft:    rowBorderLeft,
        paddingRight:  8,
        transition:    "background 0.1s",
        borderBottom:  `1px solid ${VSC.border}`,
      }}
    >
      {/* Indent guide lines */}
      {guides.map((g, i) => <GuideSegment key={i} type={g.type} />)}

      {/* Twisty arrow */}
      {hasChildren ? (
        <div
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          style={{
            width:          16,
            height:         VSC.rowH,
            flexShrink:     0,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "0.5rem",
            color:          VSC.dim,
            transform:      isOpen ? "rotate(90deg)" : "none",
            transition:     "transform 0.15s",
            cursor:         "pointer",
          }}
        >▶</div>
      ) : (
        <div style={{ width: 16, flexShrink: 0 }} />
      )}

      {/* Icon */}
      <div style={{ width: 20, flexShrink: 0, textAlign: "center", fontSize: "0.85rem" }}>
        {node.type === "spouse" ? "♥" : node.gender === "F" ? "👩" : "👨"}
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, paddingLeft: 2, overflow: "hidden" }}>

        {/* YOU badge */}
        {node.type === "you" && (
          <span style={{
            fontSize:     "0.48rem",
            padding:      "1px 5px",
            borderRadius: 3,
            background:   VSC.gold,
            color:        "#fff",
            fontWeight:   700,
            flexShrink:   0,
            fontFamily:   "'JetBrains Mono', monospace",
            letterSpacing:"0.05em",
          }}>YOU</span>
        )}

        {/* Name */}
        <span style={{
          fontSize:     "0.82rem",
          fontFamily:   "'JetBrains Mono', monospace",
          color:        nameColor,
          fontStyle:    nameFontStyle,
          fontWeight:   nameFontWeight,
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
        }}>
          {node.name || "(unknown)"}
        </span>

        {/* Gender dot */}
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: dotColor, flexShrink: 0,
        }} />

        {/* Meta */}
        {metaParts.length > 0 && (
          <span style={{
            fontSize:   "0.58rem",
            fontFamily: "'JetBrains Mono', monospace",
            color:      VSC.dim,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            // {metaParts.join(", ")}
          </span>
        )}

        {/* Candle */}
        {node.rip && (
          <span style={{ fontSize: "0.78rem", flexShrink: 0, animation: "flicker 2.5s ease-in-out infinite" }}>
            🪔
          </span>
        )}

        {/* Children badge */}
        {hasChildren && (
          <span style={{
            marginLeft:   "auto",
            fontSize:     "0.55rem",
            color:        VSC.dim,
            border:       `1px solid ${VSC.border}`,
            borderRadius: 3,
            padding:      "0 4px",
            flexShrink:   0,
            fontFamily:   "'JetBrains Mono', monospace",
            background:   "#fff",
          }}>
            {node._childCount}↓
          </span>
        )}
      </div>
    </div>
  );
}

function GuideSegment({ type }) {
  const c = VSC.indentGuide;
  const s = { width: 16, height: VSC.rowH, flexShrink: 0, position: "relative" };
  const vLine  = { position:"absolute", left:8, top:0, bottom:0, width:1, background:c };
  const vHalf  = { position:"absolute", left:8, top:0, height:"50%", width:1, background:c };
  const hLine  = { position:"absolute", left:8, top:"50%", right:0, height:1, background:c };
  return (
    <div style={s}>
      {type === "vl"   && <div style={vLine} />}
      {type === "conn" && <><div style={vLine} /><div style={hLine} /></>}
      {type === "last" && <><div style={vHalf} /><div style={hLine} /></>}
    </div>
  );
}

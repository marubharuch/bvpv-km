// pages/VanshVriksha/index.jsx
// Orchestrates the 8-step VSCode-style family tree wizard.
// Mirrors the pattern used in FamilyRegistrationFlow/index.jsx.

import "../../vanshVriksha.css";
import { useCallback, useEffect, useState } from "react";
import { useAuth }              from "../../store/AuthContext";
import { useVanshTree }         from "../../hooks/useVanshTree";
import { saveVanshTree, getVanshTree } from "../../db/vanshTreeDb";
import { TREE_STEPS }           from "../../constants/vanshConstants";
import { COLORS }               from "../../constants/app";
import {
  VscTitlebar,
  VscTabs,
  VscProgressBar,
  VscStatusBar,
  VscBottomBar,
} from "../../components/vansh/VscChrome";

import SelfStep                        from "./steps/SelfStep";
import AncestorsStep, { DescendantsStep } from "./steps/AncestorsStep";
import PreviewStep                     from "./steps/PreviewStep";
import SpousesStep                     from "./steps/SpousesStep";
import SiblingsStep                    from "./steps/SiblingsStep";
import CousinsStep                     from "./steps/CousinsStep";
import FullTreeStep                    from "./steps/FullTreeStep";

const TOTAL = 8;

export default function VanshVriksha() {
  const { user }  = useAuth();
  const tree      = useVanshTree();

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveErr,  setSaveErr]  = useState("");
  const [loading,  setLoading]  = useState(true);

  // ── Load existing tree from Firebase on mount ─────────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    getVanshTree(user.uid)
      .then(data => {
        if (data) tree.loadFromFirebase(data); // see hook below
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Validation before advancing ───────────────────────────────
  const validateCurrent = useCallback(() => {
    if (tree.step === TREE_STEPS.SELF) {
      if (!tree.self.name.trim()) { showToast("⚠ નામ ભરો"); return false; }
      if (!tree.self.gender)      { showToast("⚠ લિંગ પસંદ કરો"); return false; }
    }
    return true;
  }, [tree.step, tree.self]);

  // ── Save on final step ────────────────────────────────────────
  const handleNext = async () => {
    if (!validateCurrent()) return;

    if (tree.step === TREE_STEPS.FULL_TREE) {
      if (!user?.uid) { showToast("⚠ Login જરૂરી છે"); return; }
      setSaving(true);
      setSaveErr("");
      try {
        await saveVanshTree(user.uid, user.familyId, {
          self:        tree.self,
          ancestors:   tree.ancestors,
          descendants: tree.descendants,
          spouses:     tree.spouses,
          siblings:    tree.siblings,
          cousins:     tree.cousins,
        });
        setSaved(true);
        tree.reset(); // clear localStorage draft after successful save
        showToast("✓ Tree સફળતાપૂર્વક સાચવ્યું!");
      } catch (e) {
        console.error(e);
        setSaveErr("Save failed. Please try again.");
        showToast("⚠ Save failed — retry");
      } finally {
        setSaving(false);
      }
      return;
    }

    tree.goNext();
  };

  const allMembers = tree.getAllMembers();

  if (loading) return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background: COLORS.bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${COLORS.primary}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }} />
        <p style={{ fontSize:"0.82rem", color: COLORS.primary }}>Tree લોड થઈ રહ્યું છે...</p>
      </div>
    </div>
  );

  if (saved) return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background: COLORS.bg, padding:24, textAlign:"center" }}>
      <div style={{ fontSize:"3rem", marginBottom:12 }}>🌳</div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", color: COLORS.primaryDark, marginBottom:8 }}>
        Tree સાચવ્યું!
      </h2>
      <p style={{ fontSize:"0.82rem", color: COLORS.textSecondary, marginBottom:24 }}>
        તમારું family tree Firebase માં સફળતાપૂર્વક save થઈ ગયું.
      </p>
      <button
        onClick={() => setSaved(false)}
        style={{ padding:"10px 24px", background: COLORS.primary, color:"#fff", border:"none", borderRadius:10, fontSize:"0.88rem", fontWeight:700, cursor:"pointer" }}
      >
        ✏️ ફરીથી Edit કરો
      </button>
    </div>
  );

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100dvh",
      overflow:      "hidden",
      background:    COLORS.bg,
      fontFamily:    "'JetBrains Mono', monospace",
    }}>
      <VscTitlebar />
      <VscTabs currentStep={tree.step} onJump={tree.jumpTo} />
      <VscProgressBar currentStep={tree.step} totalSteps={TOTAL} />

      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch" }}>

        {tree.step === TREE_STEPS.SELF && (
          <SelfStep self={tree.self} onChange={tree.setSelf} />
        )}
        {tree.step === TREE_STEPS.ANCESTORS && (
          <AncestorsStep ancestors={tree.ancestors} onChange={tree.setAncestors} />
        )}
        {tree.step === TREE_STEPS.DESCS && (
          <DescendantsStep descendants={tree.descendants} onChange={tree.setDescendants} />
        )}
        {tree.step === TREE_STEPS.PREVIEW && (
          <PreviewStep self={tree.self} ancestors={tree.ancestors} descendants={tree.descendants} />
        )}
        {tree.step === TREE_STEPS.SPOUSES && (
          <SpousesStep
            self={tree.self} ancestors={tree.ancestors} descendants={tree.descendants}
            spouses={tree.spouses}
            onSetSpouse={(id, sp) => sp ? tree.setSpouse(id, sp) : tree.clearSpouse(id)}
          />
        )}
        {tree.step === TREE_STEPS.SIBLINGS && (
          <SiblingsStep
            getVerticalMembers={tree.getVerticalMembers}
            siblings={tree.siblings}
            onSetSiblingsFor={tree.setSiblingsFor}
          />
        )}
        {tree.step === TREE_STEPS.COUSINS && (
          <CousinsStep
            cousins={tree.cousins}
            onToggle={tree.toggleCousin}
            onAdd={tree.addCousin}
          />
        )}
        {tree.step === TREE_STEPS.FULL_TREE && (
          <FullTreeStep
            self={tree.self} ancestors={tree.ancestors} descendants={tree.descendants}
            spouses={tree.spouses} siblings={tree.siblings} cousins={tree.cousins}
            getAllMembers={tree.getAllMembers}
          />
        )}

        {saveErr && (
          <div style={{ margin:"0 14px", padding:"10px 14px", background:"#FDE8EC", border:`1px solid ${COLORS.error}`, borderRadius:8, fontSize:"0.78rem", color: COLORS.error }}>
            ⚠️ {saveErr}
          </div>
        )}
      </div>

      <VscBottomBar
        currentStep={tree.step}
        totalSteps={TOTAL}
        onBack={tree.goBack}
        onNext={handleNext}
        saving={saving}
      />

      <VscStatusBar memberCount={allMembers.length} />
    </div>
  );
}

function showToast(msg) {
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:75px;left:50%;transform:translateX(-50%);
    background:#fff;border:1.5px solid #C9A84C;color:#7B1C2E;
    padding:7px 16px;border-radius:18px;font-size:0.75rem;z-index:300;
    pointer-events:none;white-space:nowrap;
    box-shadow:0 2px 10px rgba(90,16,32,0.15);font-family:'Lato',sans-serif;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0"; t.style.transition = "opacity 0.3s";
    setTimeout(() => t.remove(), 300);
  }, 1800);
}
